//! OS-backed Cryptographically Secure Pseudorandom Number Generator (CSPRNG)
//! with strictly unbiased rejection sampling and Fisher-Yates shuffling.

use rand_core::{OsRng, RngCore};

use crate::CipherError;

/// Abstraction over a cryptographically secure random byte source.
///
/// In production, [`SystemCsprng`] delegates exclusively to the operating system's
/// CSPRNG (`getrandom(2)` on Linux/Android, `BCryptGenRandom` on Windows,
/// `SecRandomCopyBytes` on iOS/macOS) via `rand_core::OsRng`.
pub trait Csprng {
    /// Fill `dest` with cryptographically secure random bytes.
    fn fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), CipherError>;

    /// Draw a uniform random `u64`.
    fn next_u64(&mut self) -> Result<u64, CipherError> {
        let mut buf = [0u8; 8];
        self.fill_bytes(&mut buf)?;
        Ok(u64::from_le_bytes(buf))
    }

    /// Generate a strictly uniform random integer in `0..upper_bound`
    /// using unbiased rejection sampling (OpenBSD `arc4random_uniform` method).
    ///
    /// # Proof of Zero Modulo Bias
    /// Let $M = 2^{64}$ and $B = \text{upper\_bound} \in [1, M]$.
    /// `threshold = B.wrapping_neg() % B` computes $(2^{64} - B) \bmod B = 2^{64} \bmod B$.
    /// The accepted interval $[\text{threshold}, 2^{64} - 1]$ has exact cardinality:
    /// $$2^{64} - (2^{64} \bmod B) = k \cdot B$$
    /// which is an exact integer multiple of $B$. Therefore, reducing any accepted
    /// sample modulo $B$ yields every value in $[0, B)$ with exact probability $1/B$.
    fn random_index(&mut self, upper_bound: usize) -> Result<usize, CipherError> {
        if upper_bound == 0 {
            return Err(CipherError::InvalidConfig(
                "upper_bound must be greater than zero".to_string(),
            ));
        }
        if upper_bound == 1 {
            return Ok(0);
        }

        let bound = upper_bound as u64;
        let threshold = bound.wrapping_neg() % bound;

        loop {
            let sample = self.next_u64()?;
            if sample >= threshold {
                return Ok((sample % bound) as usize);
            }
        }
    }

    /// Perform an unbiased in-place Fisher-Yates (Knuth) shuffle using CSPRNG
    /// rejection sampling.
    fn fisher_yates_shuffle<T>(&mut self, slice: &mut [T]) -> Result<(), CipherError> {
        if slice.len() <= 1 {
            return Ok(());
        }
        for i in (1..slice.len()).rev() {
            let j = self.random_index(i + 1)?;
            slice.swap(i, j);
        }
        Ok(())
    }
}

/// Production CSPRNG backed exclusively by the OS entropy pool (`rand_core::OsRng`).
#[derive(Debug, Default, Clone, Copy)]
pub struct SystemCsprng;

impl SystemCsprng {
    pub fn new() -> Self {
        Self
    }
}

impl Csprng for SystemCsprng {
    fn fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), CipherError> {
        OsRng
            .try_fill_bytes(dest)
            .map_err(|e| CipherError::RngFailure(e.to_string()))
    }
}
