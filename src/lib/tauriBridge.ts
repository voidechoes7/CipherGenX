import type {
  Bip39Config,
  EntropyPenalty,
  GenerationMode,
  KeyBatchResult,
  KeyConfig,
  MasterFingerprint,
  PassphraseBatchResult,
  PassphraseConfig,
  PasswordBatchResult,
  PasswordConfig,
  PinConfig,
  RecoveryCodeConfig,
  SecurityAnalysis,
  SecurityLevel,
  UuidConfig,
  VaultConfig,
  VaultResult,
} from "../types/ciphergen";
import { isTauriRuntime } from "./clipboard";

export const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
export const DIGIT_CHARS = "0123456789";
export const SAFE_SYMBOL_CHARS = "!@#$%^&*-_=+?";
export const EXTENDED_SYMBOL_CHARS = "~()[]{}<>:;.,/|\\'\"`";
export const AMBIGUOUS_CHARS = "0O1lI|";

const ONLINE_THROTTLED_GPS = 100 / 3600;
const GPU_FAST_HASH_GPS = 100_000_000_000;
const GPU_ARGON2ID_GPS = 10_000;

const BASE32_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_LOWER = "abcdefghijklmnopqrstuvwxyz234567";
const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const HEX_UPPER = "0123456789ABCDEF";
const HEX_LOWER = "0123456789abcdef";
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Compact fallback wordlists used ONLY outside Tauri (browser preview / Vitest).
 * Inside the compiled Tauri 2 native app, Rust uses the complete offline 8,192-word ES,
 * 7,776-word EFF EN, and 2,048-word official BIP-39 EN/ES wordlists.
 */
const FALLBACK_DICEWARE_EN = [
  "abacus", "acorn", "admiral", "agate", "albatross", "almond", "amber", "anchor",
  "anvil", "apricot", "archway", "aurora", "badger", "bamboo", "beacon", "bison",
  "blizzard", "boulder", "bramble", "breeze", "cactus", "canyon", "caravan", "cedar",
  "chalice", "cipher", "citadel", "cobalt", "comet", "compass", "condor", "coral",
  "cosmos", "crater", "crimson", "crystal", "cypress", "dagger", "delta", "diamond",
  "dolphin", "dragon", "drift", "eclipse", "emerald", "enigma", "equinox", "falcon",
  "fathom", "feather", "flint", "forest", "fortress", "fossil", "galaxy", "garnet",
  "geyser", "glacier", "granite", "griffin", "harbor", "harvest", "horizon", "hydra",
  "iceberg", "indigo", "island", "ivory", "jackal", "jaguar", "jasper", "juniper",
  "kernel", "kestrel", "kindle", "lagoon", "lantern", "laurel", "leopard", "lichen",
  "lizard", "lotus", "magnet", "mammoth", "mantis", "marble", "meadow", "mercury",
  "meteor", "mirage", "monarch", "monolith", "nebula", "nectar", "neutron", "nimbus",
  "nomad", "obsidian", "ocelot", "octopus", "olive", "omega", "onyx", "opal",
  "oracle", "orchid", "osprey", "otter", "paladin", "panther", "paradox", "pebble",
  "pelican", "pendulum", "pepper", "phantom", "phoenix", "photon", "pioneer", "planet",
  "plasma", "platinum", "prism", "pulsar", "python", "quantum", "quartz", "quasar",
  "quiver", "radium", "raptor", "raven", "redwood", "relic", "riddle", "ripple",
  "river", "saffron", "sapphire", "saturn", "scarab", "scepter", "scroll", "sequoia",
  "shadow", "shield", "sierra", "signal", "silver", "solstice", "sparrow", "spectra",
  "sphinx", "spiral", "spruce", "starlight", "summit", "tempest", "thistle", "thunder",
  "timber", "titanium", "topaz", "torpedo", "trident", "tundra", "turbine", "twilight",
  "typhoon", "umbra", "valkyrie", "vanguard", "vector", "velvet", "vertex", "vortex",
  "voyager", "walnut", "warden", "willow", "wombat", "xenon", "yarrow", "zenith",
  "zephyr", "zircon", "zodiac", "zoom",
];

const FALLBACK_DICEWARE_ES = [
  "abeja", "abismo", "abril", "acero", "acorde", "aguila", "albahaca", "aldea",
  "alerta", "aliento", "almendra", "altura", "amapola", "ambar", "ancla", "andino",
  "anillo", "antena", "apolo", "arado", "arbol", "arcilla", "arena", "aroma",
  "arroyo", "astilla", "astro", "atalaya", "atlas", "atomo", "aurora", "avena",
  "azotea", "azufre", "bahia", "balcon", "balsa", "bambu", "bandera", "barco",
  "barro", "bastion", "batalla", "bateria", "bellota", "berilio", "blanco", "blason",
  "boina", "bosque", "boveda", "brasa", "brisa", "bronce", "brujula", "buhardilla",
  "cabana", "cacao", "cadena", "caldera", "caliza", "camino", "campana", "canela",
  "cantera", "capitan", "caracol", "carbon", "cardenal", "cascada", "castillo", "cauce",
  "caverna", "cedro", "ceniza", "centauro", "cereal", "cerrojo", "cesta", "ciclope",
  "ciencia", "ciervo", "cifra", "cima", "cipres", "circulo", "cisne", "ciudad",
  "claridad", "clavel", "clima", "cobalto", "cobre", "codigo", "cohete", "colina",
  "columna", "cometa", "compas", "condor", "convento", "coral", "cordel", "corona",
  "corteza", "cosmos", "crater", "cristal", "cronica", "cuarzo", "cubierta", "cuerda",
  "cumbre", "cupula", "daga", "delfin", "delta", "desierto", "destello", "diamante",
  "diente", "dique", "dorado", "dragon", "duna", "eclipse", "ecos", "edificio",
  "esfera", "esmalte", "espada", "espejo", "espiga", "espuma", "estacion", "estrella",
  "estuario", "eterno", "fabula", "faro", "felino", "fenix", "ferro", "fibra",
  "fiordo", "flama", "flauta", "flecha", "florero", "fogon", "fortaleza", "fosforo",
  "fragua", "fresno", "frontera", "fruto", "fuente", "fulgor", "galaxia", "galera",
  "gaviota", "gema", "genio", "glaciar", "globo", "golfo", "gorra", "granate",
  "granito", "grifo", "gruta", "guardia", "guijarro", "halcon", "harina", "helice",
  "hierro", "higuera", "hilo", "hoguera", "hoja", "horizonte", "horno", "huella",
  "huerto", "huracan", "iceberg", "icono", "iglu", "imanes", "impulso", "indigo",
  "ingenio", "isla", "jade", "jaguar", "jardin", "jazmin", "jinete", "joya",
  "junco", "jupiter", "kilo", "laberinto", "ladera", "lago", "laguna", "lampara",
  "lanza", "lapiz", "laurel", "lava", "lechuza", "leyenda", "lienzo", "linterna",
  "lirio", "llanura", "llave", "lluvia", "lobo", "loma", "loto", "lucero",
  "madera", "magma", "magneto", "maiz", "malva", "mangle", "manta", "mapa",
  "marfil", "marina", "marmol", "martillo", "mascara", "matriz", "medalla", "melodia",
  "mercurio", "meseta", "metal", "meteoro", "miel", "milagro", "mineral", "mirador",
  "mision", "mitad", "molino", "monarca", "moneda", "montana", "morada", "mosaico",
  "motor", "muralla", "musgo", "nacar", "naranja", "navio", "neblina", "nebula",
  "nectar", "neptuno", "nervio", "nevada", "nido", "niebla", "nieve", "nimbo",
  "niquel", "nivel", "noche", "nodo", "nomada", "norte", "novela", "nube",
  "nucleo", "nuez", "oasis", "obelisco", "oceano", "ocelote", "octavo", "olivo",
  "omega", "onice", "opalo", "oraculo", "orbita", "orilla", "orion", "oro",
  "orquesta", "ortiga", "ostras", "otono", "oveja", "oxigeno", "palacio", "palma",
  "pampa", "panal", "pantera", "papiro", "paraiso", "parcela", "pared", "parque",
  "pasaje", "pasillo", "patio", "pecera", "pedestal", "pelicano", "pendulo", "penumbra",
  "pepino", "perla", "persiana", "petalo", "piedra", "pienso", "pilar", "pincel",
  "pinguino", "pino", "pionero", "piramide", "piscina", "pista", "pivote", "pizarra",
  "planeta", "planta", "plasma", "plata", "platino", "playa", "plaza", "pliego",
  "plomo", "pluma", "podio", "poema", "polar", "polen", "polvora", "pomelo",
  "poniente", "portal", "portico", "posada", "postal", "potro", "pradera", "prado",
  "premio", "prensa", "prisma", "proa", "prodigio", "profeta", "pronto", "prosa",
  "puente", "puerto", "pulgar", "pulpo", "pulsar", "pulso", "punta", "punzon",
  "pupila", "pureza", "purpura", "quebrada", "queso", "quietud", "quilla", "quimera",
  "quinta", "radar", "radio", "rafaga", "raiz", "rama", "rambla", "rampa",
  "rancho", "rango", "rapido", "rasgo", "rastro", "rayo", "rebano", "recinto",
  "recodo", "recta", "redil", "reflejo", "refugio", "regalo", "regata", "region",
  "regla", "reino", "relato", "relevo", "reliquia", "reloj", "remanso", "remedio",
  "remo", "remolino", "rencor", "rendija", "renuevo", "repisa", "reposo", "reptil",
  "reserva", "resina", "resorte", "respiro", "retablo", "retazo", "retiro", "retorno",
  "retrato", "reunion", "reverso", "revista", "riachuelo", "ribera", "riego", "rienda",
  "riesgo", "rifa", "rigor", "rima", "rincon", "rio", "riqueza", "risco",
  "ritmo", "ritual", "rival", "roble", "robot", "roca", "rocio", "rodaja",
  "rodeo", "rodillo", "roedor", "rojizo", "rollo", "rombo", "romero", "ronda",
  "ropaje", "rosa", "rosal", "rosca", "rostro", "rotulo", "rotonda", "rubi",
  "rueda", "ruedo", "ruido", "ruina", "ruisenor", "rumbo", "rumor", "runa",
  "ruptura", "rural", "ruta", "rutina", "sabana", "saber", "sabio", "sable",
  "sabor", "saco", "saeta", "saffron", "sagrado", "salero", "salida", "salina",
  "salmon", "salon", "salto", "salud", "saludo", "salva", "salvaje", "sandalo",
  "sandia", "sangre", "santuario", "sapo", "saqueo", "sarampion", "sardina", "sargento",
  "sarten", "sastre", "satelite", "saturno", "sauce", "sauco", "sauna", "savia",
  "saxofon", "secano", "seccion", "secreto", "sector", "secuencia", "seda", "sedal",
  "sede", "sedimento", "segador", "segmento", "seguro", "selva", "semana", "semilla",
  "senado", "senda", "sendero", "seno", "sensor", "sentido", "senal", "senor",
  "sepalo", "sequia", "sereno", "serie", "sermon", "serpiente", "serrano", "serrucho",
  "servicio", "sesamo", "sesion", "seta", "seto", "severo", "sextante", "siembra",
  "siempre", "sierra", "siesta", "sigilo", "siglo", "signo", "silaba", "silbato",
  "silencio", "silice", "silla", "sillon", "silo", "silueta", "sima", "simbolo",
  "simetria", "simiente", "simio", "simple", "sinapsis", "sincero", "sinfonia", "singular",
  "sirena", "sistema", "sitio", "sobrante", "sobre", "sociedad", "socio", "socorro",
  "sodio", "sofa", "soga", "solar", "soldado", "soledad", "solera", "solido",
  "solista", "solomo", "solsticio", "soltura", "sombra", "sombrero", "sonaja", "sonata",
  "sonda", "sonido", "sonrisa", "soplo", "soporte", "sorbete", "sorbo", "sordo",
  "sorpresa", "sorteo", "sortija", "sosiego", "sostener", "sotano", "soto", "suave",
  "subasta", "subida", "subito", "sublime", "subsuelo", "suceso", "sucursal", "sudario",
  "sudeste", "sudoeste", "suela", "sueldo", "suelo", "sueno", "suero", "suerte",
  "sueter", "sufijo", "sufragio", "sujeto", "sulfato", "sultan", "suma", "sumario",
  "sumergir", "sumidero", "sumiso", "sumo", "suntuoso", "superar", "suplente", "suplica",
  "sopapo", "surco", "sureste", "suroeste", "surtidor", "suspiro", "sustento", "sustrato",
  "susurro", "sutil", "sutura", "tabaco", "taberna", "tabique", "tabla", "tablero",
  "tableta", "tablon", "taburete", "taca", "tachuela", "tacito", "taco", "tacon",
  "tactica", "tacto", "tafetán", "tajo", "taladro", "talamo", "talante", "talco",
  "talento", "talisman", "talla", "taller", "tallo", "talon", "talud", "tamal",
  "tamano", "tambor", "tamiz", "tampoco", "tandem", "tangente", "tango", "tanque",
  "tanteo", "tapa", "tapete", "tapia", "tapiz", "tapon", "taquilla", "tara",
  "tardanza", "tarde", "tarea", "tarifa", "tarima", "tarjeta", "tarot", "tarro",
  "tarta", "tartaro", "tasa", "tasador", "tasca", "tatami", "tatuaje", "tauro",
  "taxista", "taza", "tazon", "teatro", "tebeo", "techo", "tecla", "teclado",
  "tecnica", "tedio", "teja", "tejado", "tejedor", "tejido", "tejon", "tela",
  "telar", "telaraña", "tele", "telegrama", "telon", "tema", "temario", "temblor",
  "temor", "tempano", "templo", "temporada", "temprano", "tenaza", "tendedor", "tendon",
  "tenedor", "tenencia", "teniente", "tenis", "tenor", "tension", "tenso", "tentaculo",
  "tenue", "teorema", "teoria", "terapia", "tercero", "tercio", "terco", "terma",
  "termico", "termino", "termo", "terna", "ternera", "ternura", "terraza", "terreno",
  "terron", "terruño", "terso", "tesauro", "tesis", "teson", "tesoro", "testigo",
  "tetera", "tetralogia", "texto", "textura", "tiara", "tibia", "tibio", "tiburon",
  "tiempo", "tienda", "tiento", "tierno", "tierra", "tieso", "tiesto", "tifon",
  "tigre", "tijera", "tila", "tilde", "tilo", "timbal", "timbre", "timido",
  "timon", "timpano", "tina", "tinaja", "tiniebla", "tino", "tinta", "tinte",
  "tintero", "tinto", "tintura", "tiovivo", "tipico", "tipo", "tira", "tirada",
  "tirador", "tirante", "tiranía", "tirita", "tiro", "tirolesa", "tiron", "titan",
  "titanio", "titere", "titilar", "titular", "titulo", "tiza", "tizon", "toalla",
  "tobillo", "tobogán", "tocador", "tocino", "todavia", "todo", "toga", "toldo",
  "toledo", "tolva", "toma", "tomate", "tombola", "tomillo", "tomo", "tonada",
  "tonel", "tonelada", "tonica", "tonico", "tono", "topacio", "tope", "topico",
  "topo", "toque", "torax", "torbellino", "torcaz", "torcedura", "tormenta", "torneo",
  "tornillo", "torno", "toro", "torpedo", "torre", "torreon", "torrente", "torso",
  "torta", "tortilla", "tortuga", "torvo", "tosco", "tostada", "tostador", "total",
  "totem", "toxina", "traba", "trabajo", "trabalenguas", "tractor", "traduccion", "trafico",
  "tragedia", "trago", "traicion", "trailer", "traje", "trama", "tramite", "tramo",
  "trampa", "trampolin", "trance", "tranco", "tranquera", "tranquia", "tranvia", "trapecio",
  "trapo", "traquea", "trasero", "trasgo", "traslado", "trasluz", "traspaso", "traste",
  "trasto", "tratado", "trato", "trauma", "travesia", "travieso", "trayecto", "traza",
  "trazado", "trazo", "trebol", "trecho", "tregua", "treinta", "tremolo", "tren",
  "trenca", "trenza", "trepador", "trepano", "tres", "treta", "triada", "triangulo",
  "tribu", "tribuna", "tribunal", "tributo", "triciclo", "tridente", "triduo", "trienio",
  "trigo", "trilero", "trilla", "trillo", "trilogia", "trimestre", "trinar", "trinca",
  "trinchera", "trineo", "trinidad", "trino", "trinomio", "trio", "tripa", "triple",
  "triplicado", "tripode", "triquiñuela", "trirreme", "tristeza", "triton", "triturar", "triunfo",
  "trivial", "trizas", "trofeo", "troglodita", "troje", "trolebus", "trol", "tromba",
  "trombon", "trompa", "trompeta", "trompo", "tronada", "tronco", "tronera", "trono",
  "tropa", "tropel", "tropero", "tropico", "tropiezo", "tropo", "troquel", "trote",
  "trova", "trovador", "trozo", "trucha", "truco", "trueno", "trueque", "trufa",
  "truhan", "trullo", "trunco", "tuareg", "tuba", "tuberia", "tubo", "tucan",
  "tuerca", "tuerto", "tuetano", "tufo", "tugurio", "tul", "tulipan", "tulla",
  "tumba", "tumbo", "tumbona", "tumefacto", "tumor", "tumulo", "tumulto", "tuna",
  "tunda", "tundra", "tunel", "tunica", "tupido", "turba", "turbante", "turbina",
  "turbio", "turbo", "turbulencia", "turco", "turgencia", "turismo", "turista", "turma",
  "turno", "turquesa", "turron", "tusa", "tutela", "tutor", "tutoria", "tutu",
  "ubicuidad", "ubique", "ubre", "ufano", "ukelele", "ulcera", "ulterior", "ultimo",
  "ultra", "ultraje", "ultramar", "ulular", "umbilical", "umbral", "umbria", "unanimidad",
  "uncion", "undecimo", "unguento", "unico", "unicornio", "unidad", "uniforme", "union",
  "unisono", "unitario", "universo", "uno", "untar", "unto", "untuoso", "upa",
  "urano", "uranio", "urbano", "urbe", "urdimbre", "urgencia", "urna", "urraca",
  "urticaria", "usanza", "usuario", "usura", "utensilio", "util", "utilidad", "utopia",
  "uva", "vacacion", "vacante", "vaciar", "vacio", "vacuna", "vado", "vagon",
  "vagoneta", "vaguada", "vahido", "vaho", "vaina", "vainilla", "vaiven", "vajilla",
  "vale", "valencia", "valentia", "valeriana", "valeroso", "valia", "validez", "valido",
  "valija", "valioso", "valla", "vallado", "valle", "valor", "vals", "valuar",
  "valvula", "vampiro", "vanadio", "vandalo", "vanguardia", "vanidad", "vano", "vapor",
  "vaporoso", "vaquero", "vara", "varal", "varanda", "varapalo", "variable", "variacion",
  "variante", "varice", "variedad", "varilla", "vario", "varita", "varon", "vasallo",
  "vasco", "vascula", "vasija", "vaso", "vastago", "vasto", "vate", "vaticinio",
  "vatio", "vecindad", "vecino", "vector", "veda", "vedado", "vedette", "vega",
  "vegetal", "vehemencia", "vehiculo", "veinte", "veintena", "vejamen", "vejestorio", "vejez",
  "vejiga", "vela", "velada", "velador", "velamen", "velero", "veleta", "vello",
  "vellon", "velludo", "velo", "velocidad", "velodromo", "veloz", "vena", "venablo",
  "venado", "vencedor", "vencejo", "venda", "vendaje", "vendaval", "vendedor", "vendimia",
  "veneno", "venerable", "venero", "venganza", "venia", "venida", "venidero", "venta",
  "ventaja", "ventana", "ventanal", "ventanilla", "ventisca", "ventosa", "ventral", "ventura",
  "venus", "veracidad", "veranda", "veraneo", "verano", "veras", "veraz", "verbal",
  "verbena", "verbo", "verborrea", "verdad", "verdadero", "verde", "verderon", "verdina",
  "verdor", "verdugo", "verdura", "vereda", "veredicto", "verga", "vergel", "verguenza",
  "vericueto", "veridico", "verija", "verja", "vermut", "vernaculo", "vernal", "veronica",
  "verruga", "versado", "versatil", "version", "verso", "vertebra", "vertedero", "vertice",
  "vertiente", "vertigo", "vesania", "vesicula", "vespertino", "vestal", "vestibulo", "vestido",
  "vestigio", "vestimenta", "vestuario", "veta", "veterano", "veto", "vetusto", "vez",
  "via", "viaducto", "viaje", "viajero", "vial", "vianda", "viatico", "vibora",
  "vibracion", "vibrato", "vicario", "viceversa", "vicio", "vicisitud", "victima", "victoria",
  "vicuña", "vid", "vida", "vidente", "video", "vidriera", "vidrio", "vieira",
  "viejo", "viento", "vientre", "viernes", "viga", "vigencia", "vigente", "vigesimo",
  "vigia", "vigilancia", "vigilia", "vigor", "vigoria", "vigoroso", "vihuela", "vikingo",
  "vil", "vileza", "villa", "villancico", "villano", "villorio", "vilordo", "vimbre",
  "vinagre", "vinaza", "vinculo", "vindicacion", "vinedo", "vineta", "vinilo", "vino",
  "viola", "violaceo", "violencia", "violeta", "violin", "violon", "violoncelo", "viperino",
  "viraje", "viral", "virazon", "virgen", "virgo", "virgulilla", "viril", "virola",
  "virrey", "virtual", "virtud", "virtuoso", "viruela", "virulencia", "virus", "viruta",
  "visa", "visado", "visaje", "viscera", "viscoso", "visera", "visible", "visigodo",
  "vision", "visir", "visita", "visitante", "vislumbre", "viso", "vison", "visor",
  "vispera", "vista", "vistazo", "visto", "vistoso", "visual", "vital", "vitalicio",
  "vitalidad", "vitamina", "vitela", "vitola", "vitor", "vitorear", "vitral", "vitreo",
  "vitrina", "vitriolo", "vitualla", "vituperio", "viuda", "viudedad", "viudo", "viva",
  "vivacidad", "vivac", "vivaracho", "vivaz", "vivero", "viveres", "viveza", "vivienda",
  "viviente", "vivir", "vivo", "vizcaino", "vizconde", "vocablo", "vocabulario", "vocacion",
  "vocal", "vocero", "vociferar", "vodka", "voga", "volada", "voladero", "volador",
  "voladura", "volandero", "volante", "volantin", "volapie", "volar", "volatil", "volcan",
  "volcar", "volea", "voleibol", "voleo", "volicion", "volquete", "voltaje", "voltear",
  "voltereta", "voltio", "voluble", "volumen", "voluntad", "voluptuoso", "voluta", "volver",
  "vomito", "voracidad", "voragine", "voraz", "vortice", "vosotros", "votacion", "votante",
  "voto", "voz", "vozarrón", "vuelco", "vuelo", "vuelta", "vuelto", "vuestro",
  "vulcanico", "vulcano", "vulgar", "vulgo", "vulnerable", "vulva", "watio", "weber",
  "western", "whisky", "xenofobia", "xenon", "xilofono", "xilografia", "yacimiento", "yacer",
  "yacija", "yacente", "yaga", "yagua", "yak", "yambo", "yanqui", "yanta",
  "yapa", "yarda", "yarey", "yaro", "yate", "yatagan", "yedra", "yegua",
  "yeguada", "yelmo", "yema", "yen", "yerba", "yerbajo", "yermo", "yerno",
  "yerro", "yerto", "yesca", "yeseria", "yeso", "yesquero", "yeti", "yo",
  "yodo", "yoga", "yoghurt", "yogur", "yol", "yola", "yonqui", "yuca",
  "yugada", "yugo", "yugular", "yunque", "yunta", "yute", "yuxtapuesto", "zabra",
  "zaca", "zacate", "zafacoca", "zafado", "zafar", "zafarrancho", "zafio", "zafir",
  "zafiro", "zafra", "zaga", "zagal", "zaguan", "zaherir", "zahon", "zahori",
  "zahurda", "zaino", "zalamero", "zalea", "zaleo", "zamarra", "zambo", "zambomba",
  "zambullir", "zampa", "zampar", "zampoña", "zanahoria", "zanca", "zancada", "zancadilla",
  "zanco", "zancudo", "zanganear", "zangano", "zangarrear", "zanja", "zanjar", "zapa",
  "zapador", "zapallo", "zapata", "zapatazo", "zapateado", "zapatero", "zapatilla", "zapato",
  "zape", "zapear", "zapote", "zaque", "zar", "zarabanda", "zaragata", "zaraguelles",
  "zaranda", "zarandaja", "zarandear", "zarangollo", "zaraza", "zarcear", "zarcillo", "zarco",
  "zarevitz", "zarina", "zarpa", "zarpazo", "zarpar", "zarrapastroso", "zarza", "zarzal",
  "zarzamora", "zarzuela", "zas", "zascandil", "zata", "zatara", "zatico", "zato",
  "zeda", "zedilla", "zelote", "zend", "zenit", "zepelin", "zequi", "zester",
  "zeta", "zigzag", "zinnia", "zipizape", "zircón", "zocalo", "zoco", "zodiaco",
  "zoilo", "zolocho", "zoma", "zombi", "zompo", "zona", "zoncería", "zopenco",
  "zopo", "zoquete", "zorra", "zorrastrón", "zorrera", "zorrillo", "zorro", "zorzal",
  "zote", "zozobra", "zua", "zubia", "zueco", "zuiza", "zulaque", "zulla",
  "zulu", "zumacar", "zumaque", "zumba", "zumbar", "zumbido", "zumbon", "zumo",
  "zunchar", "zuncho", "zupia", "zura", "zurcido", "zurcir", "zurdo", "zurra",
  "zurrapa", "zurrar", "zurriago", "zurriburri", "zurrido", "zurron", "zutano", "zuzar",
].filter((w) => /^[a-z]+$/.test(w));

const COMMON_WEAK_WORDS = [
  "password", "passw0rd", "contraseña", "contrasena", "admin", "administrator", "root",
  "qwerty", "qwertyuiop", "asdfgh", "zxcvbn", "letmein", "welcome", "bienvenido",
  "iloveyou", "teamo", "tequiero", "monkey", "dragon", "baseball", "football", "futbol",
  "superman", "batman", "spiderman", "master", "maestro", "shadow", "sunshine", "princess",
  "princesa", "estrella", "starwars", "pokemon", "naruto", "minecraft", "fortnite",
  "secreto", "secret", "clave", "usuario", "login", "acceso", "cuenta", "sistema",
  "familia", "amigos", "amor", "corazon", "hola", "holamundo", "prueba", "test",
  "colombia", "mexico", "espana", "argentina", "chile", "peru", "madrid", "barcelona",
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre", "summer", "winter", "verano",
  "invierno", "google", "facebook", "instagram", "netflix", "amazon", "apple",
  "microsoft", "windows", "android", "iphone", "github", "bitcoin", "crypto",
  "hacker", "matrix", "security", "seguridad", "dinero", "money", "banco", "bank",
];

const KEYBOARD_ROWS = [
  "1234567890",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "qazwsxedcrfvtgbyhnujmikolp",
  "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p",
  "qweasdzxc",
  "7894561230",
];

/**
 * Unbiased rejection sampling over Web Crypto CSPRNG (32-bit uniform).
 */
export function webCryptoRandomIndex(upperBound: number): number {
  if (upperBound <= 0) {
    throw new Error("upperBound must be > 0");
  }
  if (upperBound === 1) return 0;

  const maxUint32 = 0x1_0000_0000;
  const threshold = maxUint32 % upperBound;
  const buf = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] >= threshold) {
      return buf[0] % upperBound;
    }
  }
}

export function fisherYatesShuffleWeb<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = webCryptoRandomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function securityLevelFromEntropy(entropyBits: number): {
  level: SecurityLevel;
  label: string;
} {
  if (entropyBits < 50) return { level: "weak", label: "Débil" };
  if (entropyBits < 80) return { level: "fair", label: "Aceptable" };
  if (entropyBits < 128) return { level: "strong", label: "Fuerte" };
  if (entropyBits < 256) return { level: "ultraStrong", label: "Ultra Segura" };
  return { level: "postQuantum", label: "Post-Cuántica" };
}

export function formatDurationFromLog10Seconds(log10Secs: number): string {
  if (log10Secs < -2) return "Instantáneo (< 0.01 s)";

  if (log10Secs <= 15) {
    const secs = Math.pow(10, log10Secs);
    if (secs < 1) return `${secs.toFixed(2)} segundos`;
    if (secs < 60) return `${secs.toFixed(1)} segundos`;
    const mins = secs / 60;
    if (mins < 60) return `${mins.toFixed(1)} minutos`;
    const hours = mins / 60;
    if (hours < 24) return `${hours.toFixed(1)} horas`;
    const days = hours / 24;
    if (days < 365.25) return `${days.toFixed(1)} días`;
    const years = days / 365.25;
    if (years < 1_000) return `${years.toFixed(1)} años`;
    if (years < 1_000_000) return `${(years / 1_000).toFixed(1)} mil años`;
    return `${(years / 1_000_000).toFixed(1)} millones de años`;
  }

  const log10Years = log10Secs - Math.log10(31_557_600);
  if (log10Years < 9) {
    return `${Math.pow(10, log10Years - 6).toFixed(1)} millones de años`;
  }
  if (log10Years < 12) {
    return `${Math.pow(10, log10Years - 9).toFixed(1)} mil millones de años`;
  }
  return `~10^${Math.floor(log10Years)} años (> edad del universo)`;
}

function avgCrackLog10Secs(entropyBits: number, gps: number): number {
  const avgBits = Math.max(entropyBits - 1, 0);
  return avgBits * Math.LOG10E * Math.LN2 - Math.log10(gps);
}

export function analyzeEntropyLocal(
  entropyBits: number,
  mode: GenerationMode,
  alphabetSize: number
): SecurityAnalysis {
  const clamped = Math.max(entropyBits, 0);
  const rounded = Math.round(clamped * 100) / 100;
  const { level, label } = securityLevelFromEntropy(clamped);
  const scorePercent = Math.min(100, Math.max(0, Math.round((clamped / 256) * 100)));
  const quantumBits = clamped / 2;
  const isPostQuantumSafe = quantumBits >= 128;

  let summary: string;
  if (quantumBits < 64) {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits (Grover reduce la búsqueda a O(√N)). Vulnerable frente a un computador cuántico tolerante a fallos.`;
  } else if (quantumBits < 96) {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits bajo Grover. Adecuado hoy, pero por debajo del objetivo post-cuántico de 128 bits efectivos.`;
  } else if (quantumBits < 128) {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits bajo Grover. Fuerte resistencia clásica; alcanza ≥ 256 bits clásicos para nivel post-cuántico completo.`;
  } else {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits efectivos bajo Grover (≥ 128 bits). Resistente incluso ante ataques cuadráticos cuánticos.`;
  }

  const recommendations: string[] = [];
  if (level === "weak") {
    recommendations.push(
      "Entropía crítica: incrementa la longitud o añade más conjuntos de caracteres de inmediato."
    );
  } else if (level === "fair") {
    recommendations.push(
      "Aumenta la entropía por encima de 80 bits para proteger cuentas críticas frente a filtraciones de hashes rápidos."
    );
  } else if (level === "strong") {
    recommendations.push(
      "Buena fortaleza para uso diario. Para bóvedas maestras o cifrado de disco, apunta a ≥ 128 bits."
    );
  } else if (level === "ultraStrong") {
    recommendations.push(
      "Resistencia criptográfica excelente contra fuerza bruta clásica. Si buscas margen post-cuántico completo (≥ 128 bits bajo Grover), sube a ≥ 256 bits."
    );
  } else {
    recommendations.push(
      "Nivel Post-Cuántico alcanzado (≥ 256 bits clásicos / ≥ 128 bits efectivos bajo Grover). Ideal para llaves maestras y cifrado a largo plazo."
    );
  }

  if (mode === "pin") {
    recommendations.push(
      "Los PINs solo son seguros en sistemas con bloqueo por intentos fallidos o hardware seguro (TPM / Secure Enclave)."
    );
  } else if (mode === "passphrase") {
    recommendations.push(
      "Las frases Diceware (ES 8,192 / EFF 7,776) de 6+ palabras ofrecen alta entropía y excelente memorabilidad para contraseñas maestras."
    );
  } else if (mode === "password") {
    recommendations.push(
      "Almacena contraseñas largas en un gestor cifrado con Argon2id y nunca reutilices la misma clave entre servicios."
    );
  } else if (mode === "bip39") {
    recommendations.push(
      "Semilla BIP-39 estándar con suma de verificación SHA-256. Guárdala únicamente en papel o metal offline."
    );
  } else if (mode === "uuidV4") {
    recommendations.push(
      "UUID v4 (RFC 9562) con 122 bits de entropía pura CSPRNG; ideal como identificador único no predecible."
    );
  } else if (mode === "recoveryCode") {
    recommendations.push(
      "Códigos de recuperación 2FA sin caracteres ambiguos (5 bits/carácter). Guárdalos en un respaldo físico seguro."
    );
  } else if (mode === "vaultDerived") {
    recommendations.push(
      "Clave determinista derivada localmente sin almacenamiento en disco. Usa los mismos parámetros para regenerarla en cualquier dispositivo."
    );
  } else {
    recommendations.push(
      "Llave o token binario de entropía exacta generado directamente desde CSPRNG; ideal para APIs, JWT, TOTP y cifrado simétrico."
    );
  }

  return {
    entropyBits: rounded,
    theoreticalEntropyBits: rounded,
    alphabetSize,
    level,
    levelLabel: label,
    scorePercent,
    crackTimes: {
      onlineThrottled: formatDurationFromLog10Seconds(
        avgCrackLog10Secs(clamped, ONLINE_THROTTLED_GPS)
      ),
      gpuFastHash: formatDurationFromLog10Seconds(
        avgCrackLog10Secs(clamped, GPU_FAST_HASH_GPS)
      ),
      gpuArgon2id: formatDurationFromLog10Seconds(
        avgCrackLog10Secs(clamped, GPU_ARGON2ID_GPS)
      ),
    },
    quantumGrover: {
      effectiveBits: Math.round(quantumBits * 100) / 100,
      isPostQuantumSafe,
      summary,
    },
    penalties: [],
    recommendations,
  };
}

export function generatePasswordsFallback(
  config: PasswordConfig
): PasswordBatchResult {
  if (config.length < 8 || config.length > 128) {
    throw new Error("La longitud debe estar entre 8 y 128 caracteres.");
  }
  if (config.count < 1 || config.count > 10) {
    throw new Error("El lote debe estar entre 1 y 10.");
  }

  const customExclude = config.customExclude ?? "";
  const filter = (s: string) =>
    [...s].filter(
      (c) =>
        (!config.excludeAmbiguous || !AMBIGUOUS_CHARS.includes(c)) &&
        !customExclude.includes(c)
    );

  const sets: string[][] = [];
  if (config.uppercase) sets.push(filter(UPPERCASE_CHARS));
  if (config.lowercase) sets.push(filter(LOWERCASE_CHARS));
  if (config.numbers) sets.push(filter(DIGIT_CHARS));
  if (config.safeSymbols) sets.push(filter(SAFE_SYMBOL_CHARS));
  if (config.extendedSymbols) sets.push(filter(EXTENDED_SYMBOL_CHARS));

  const activeSets = sets.filter((s) => s.length > 0);
  if (activeSets.length === 0) {
    throw new Error(
      "No quedan caracteres disponibles: activa al menos un conjunto o reduce las exclusiones personalizadas."
    );
  }

  const combined = Array.from(new Set(activeSets.flat()));
  if (combined.length < 2) {
    throw new Error(
      "El alfabeto efectivo debe contener al menos 2 caracteres distintos."
    );
  }

  const entropyBits = config.length * Math.log2(combined.length);
  const analysis = analyzeEntropyLocal(entropyBits, "password", combined.length);

  const items = Array.from({ length: config.count }, () => {
    const chars: string[] = [];
    for (const set of activeSets) {
      chars.push(set[webCryptoRandomIndex(set.length)]);
    }
    for (let i = activeSets.length; i < config.length; i++) {
      chars.push(combined[webCryptoRandomIndex(combined.length)]);
    }
    const shuffled = fisherYatesShuffleWeb(chars);
    return {
      value: shuffled.join(""),
      entropyBits,
      mode: "password" as const,
    };
  });

  return {
    items,
    effectiveAlphabetSize: combined.length,
    analysis,
  };
}

export function generatePassphrasesFallback(
  config: PassphraseConfig
): PassphraseBatchResult {
  if (config.wordCount < 4 || config.wordCount > 12) {
    throw new Error("El número de palabras debe estar entre 4 y 12.");
  }
  if (config.count < 1 || config.count > 10) {
    throw new Error("El lote debe estar entre 1 y 10.");
  }

  const wordlist =
    config.language === "en" ? FALLBACK_DICEWARE_EN : FALLBACK_DICEWARE_ES;
  const wordlistSize = wordlist.length;
  let entropyBits = config.wordCount * Math.log2(wordlistSize);
  if (config.includeNumber) {
    entropyBits += Math.log2(config.wordCount * 10);
  }
  if (config.capitalization === "randomWord") {
    entropyBits += Math.log2(config.wordCount);
  }

  const analysis = analyzeEntropyLocal(entropyBits, "passphrase", wordlistSize);

  const items = Array.from({ length: config.count }, () => {
    const words = Array.from({ length: config.wordCount }, () => {
      const w = wordlist[webCryptoRandomIndex(wordlistSize)];
      if (config.capitalization === "title") {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      if (config.capitalization === "upper") {
        return w.toUpperCase();
      }
      return w;
    });

    if (config.capitalization === "randomWord") {
      const pos = webCryptoRandomIndex(config.wordCount);
      words[pos] = words[pos].toUpperCase();
    }
    if (config.includeNumber) {
      const pos = webCryptoRandomIndex(config.wordCount);
      const digit = webCryptoRandomIndex(10);
      words[pos] = `${words[pos]}${digit}`;
    }

    return {
      value: words.join(config.separator),
      entropyBits,
      mode: "passphrase" as const,
    };
  });

  return { items, wordlistSize, analysis };
}

export function generatePinsFallback(config: PinConfig): KeyBatchResult {
  if (config.length < 4 || config.length > 16) {
    throw new Error("La longitud del PIN debe estar entre 4 y 16 dígitos.");
  }
  const entropyBits = config.length * Math.log2(10);
  const analysis = analyzeEntropyLocal(entropyBits, "pin", 10);

  const items = Array.from({ length: config.count }, () => {
    let pin = "";
    for (let i = 0; i < config.length; i++) {
      pin += String(webCryptoRandomIndex(10));
    }
    return { value: pin, entropyBits, mode: "pin" as const };
  });

  return { items, analysis };
}

function encodeBase32(bytes: Uint8Array, uppercase: boolean): string {
  const table = uppercase ? BASE32_UPPER : BASE32_LOWER;
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += table[(buffer >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    out += table[(buffer << (5 - bits)) & 0x1f];
  }
  return out;
}

function encodeHex(bytes: Uint8Array, uppercase: boolean): string {
  const table = uppercase ? HEX_UPPER : HEX_LOWER;
  let out = "";
  for (const b of bytes) {
    out += table[(b >> 4) & 0x0f] + table[b & 0x0f];
  }
  return out;
}

export function encodeBase64Url(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i + 3 <= bytes.length) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      BASE64URL_ALPHABET[(n >> 18) & 0x3f] +
      BASE64URL_ALPHABET[(n >> 12) & 0x3f] +
      BASE64URL_ALPHABET[(n >> 6) & 0x3f] +
      BASE64URL_ALPHABET[n & 0x3f];
    i += 3;
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out +=
      BASE64URL_ALPHABET[(n >> 18) & 0x3f] +
      BASE64URL_ALPHABET[(n >> 12) & 0x3f];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out +=
      BASE64URL_ALPHABET[(n >> 18) & 0x3f] +
      BASE64URL_ALPHABET[(n >> 12) & 0x3f] +
      BASE64URL_ALPHABET[(n >> 6) & 0x3f];
  }
  return out;
}

export function generateKeysFallback(config: KeyConfig): KeyBatchResult {
  const bits = Number(config.bits) || 256;
  const byteLen = bits / 8;
  const mode: GenerationMode =
    config.format === "hex"
      ? "hexKey"
      : config.format === "base32"
      ? "base32Key"
      : "base64UrlKey";
  const alphabetSize =
    config.format === "hex" ? 16 : config.format === "base32" ? 32 : 64;
  const analysis = analyzeEntropyLocal(bits, mode, alphabetSize);

  const items = Array.from({ length: config.count }, () => {
    const raw = new Uint8Array(byteLen);
    crypto.getRandomValues(raw);
    const encoded =
      config.format === "hex"
        ? encodeHex(raw, config.uppercase)
        : config.format === "base32"
        ? encodeBase32(raw, config.uppercase)
        : encodeBase64Url(raw);
    raw.fill(0);
    const value =
      config.grouped && config.format !== "base64Url"
        ? encoded.replace(/(.{4})(?=.)/g, "$1-")
        : encoded;
    return { value, entropyBits: bits, mode };
  });

  return { items, analysis };
}

export function generateUuidsFallback(config: UuidConfig): KeyBatchResult {
  const entropyBits = 122;
  const analysis = analyzeEntropyLocal(entropyBits, "uuidV4", 16);

  const items = Array.from({ length: config.count }, () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = encodeHex(bytes, config.uppercase);
    bytes.fill(0);
    const value = config.hyphens
      ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
      : hex;
    return { value, entropyBits, mode: "uuidV4" as const };
  });

  return { items, analysis };
}

export function generateRecoveryCodesFallback(
  config: RecoveryCodeConfig
): KeyBatchResult {
  const spec: Record<RecoveryCodeConfig["format"], [number, number]> = {
    blocks4x2: [2, 4],
    blocks5x2: [2, 5],
    blocks4x4: [4, 4],
  };
  const [groups, blockLen] = spec[config.format] ?? [2, 5];
  const entropyBits = groups * blockLen * Math.log2(RECOVERY_ALPHABET.length);
  const analysis = analyzeEntropyLocal(
    entropyBits,
    "recoveryCode",
    RECOVERY_ALPHABET.length
  );

  const items = Array.from({ length: config.count }, () => {
    const blocks = Array.from({ length: groups }, () => {
      let block = "";
      for (let i = 0; i < blockLen; i++) {
        block += RECOVERY_ALPHABET[webCryptoRandomIndex(RECOVERY_ALPHABET.length)];
      }
      return block;
    });
    return {
      value: blocks.join("-"),
      entropyBits,
      mode: "recoveryCode" as const,
    };
  });

  return { items, analysis };
}

export function generateBip39Fallback(config: Bip39Config): KeyBatchResult {
  const wordCount = Number(config.wordCount) || 24;
  const entropyBits = (wordCount / 3) * 32;
  const analysis = analyzeEntropyLocal(entropyBits, "bip39", 2048);
  const words =
    config.language === "es" ? FALLBACK_DICEWARE_ES : FALLBACK_DICEWARE_EN;

  const items = Array.from({ length: config.count }, () => {
    const picked = Array.from(
      { length: wordCount },
      () => words[webCryptoRandomIndex(words.length)]
    );
    return {
      value: picked.join(" "),
      entropyBits,
      mode: "bip39" as const,
    };
  });

  return { items, analysis };
}

async function sha256Bytes(data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return new Uint8Array(digest);
}

export async function computeMasterFingerprintFallback(
  masterPassword: string
): Promise<MasterFingerprint> {
  const enc = new TextEncoder().encode(
    `CipherGenX-MasterFingerprint-v1\0${masterPassword}`
  );
  const digest = await sha256Bytes(enc);
  const code = encodeHex(digest.slice(0, 2), true);
  const symbolIndices: [number, number, number] = [
    digest[2] & 0x0f,
    digest[3] & 0x0f,
    digest[4] & 0x0f,
  ];
  const hueDeg = ((digest[5] << 8) | digest[6]) % 360;
  digest.fill(0);
  return { code, symbolIndices, hueDeg };
}

export async function deriveVaultPasswordFallback(
  config: VaultConfig
): Promise<VaultResult> {
  if (!config.masterPassword) {
    throw new Error("Ingresa tu contraseña maestra para derivar la clave.");
  }
  if (!config.site.trim()) {
    throw new Error("Ingresa el nombre del sitio o servicio (ej. github.com).");
  }
  if (config.counter < 1 || config.counter > 999_999) {
    throw new Error("El contador de versión debe estar entre 1 y 999,999.");
  }

  const customExclude = config.customExclude ?? "";
  const filter = (s: string) =>
    [...s].filter(
      (c) =>
        (!config.excludeAmbiguous || !AMBIGUOUS_CHARS.includes(c)) &&
        !customExclude.includes(c)
    );

  const sets: string[][] = [];
  if (config.uppercase) sets.push(filter(UPPERCASE_CHARS));
  if (config.lowercase) sets.push(filter(LOWERCASE_CHARS));
  if (config.numbers) sets.push(filter(DIGIT_CHARS));
  if (config.safeSymbols) sets.push(filter(SAFE_SYMBOL_CHARS));
  if (config.extendedSymbols) sets.push(filter(EXTENDED_SYMBOL_CHARS));

  const activeSets = sets.filter((s) => s.length > 0);
  if (activeSets.length === 0) {
    throw new Error("Debes activar al menos un conjunto de caracteres.");
  }
  const combined = Array.from(new Set(activeSets.flat()));
  if (combined.length < 2) {
    throw new Error("El alfabeto efectivo debe tener al menos 2 caracteres.");
  }

  const fingerprint = await computeMasterFingerprintFallback(
    config.masterPassword
  );

  const encoder = new TextEncoder();
  const saltInput = encoder.encode(
    `CipherGenX-WebFallback-v1\0${config.site.trim().toLowerCase()}\0${config.login.trim()}\0${config.counter}\0${config.length}\0${customExclude}`
  );
  const saltHash = await sha256Bytes(saltInput);

  const masterBytes = encoder.encode(config.masterPassword);
  const keyMat = await crypto.subtle.importKey(
    "raw",
    masterBytes.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBuf = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltHash.buffer as ArrayBuffer,
      iterations: 150_000,
      hash: "SHA-256",
    },
    keyMat,
    512
  );
  const seed = new Uint8Array(derivedBuf);

  // Deterministic counter-mode byte stream
  let ctr = 0;
  let buf = new Uint8Array(0);
  let offset = 0;
  const nextU32 = async (): Promise<number> => {
    if (offset + 4 > buf.length) {
      const msg = new Uint8Array(seed.length + 4);
      msg.set(seed, 0);
      msg[seed.length] = (ctr >>> 24) & 0xff;
      msg[seed.length + 1] = (ctr >>> 16) & 0xff;
      msg[seed.length + 2] = (ctr >>> 8) & 0xff;
      msg[seed.length + 3] = ctr & 0xff;
      ctr += 1;
      buf = await sha256Bytes(msg);
      offset = 0;
    }
    const v =
      ((buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3]) >>>
      0;
    offset += 4;
    return v;
  };

  const detIndex = async (bound: number): Promise<number> => {
    if (bound <= 1) return 0;
    const threshold = 0x1_0000_0000 % bound;
    while (true) {
      const sample = await nextU32();
      if (sample >= threshold) return sample % bound;
    }
  };

  const chars: string[] = [];
  for (const set of activeSets) {
    chars.push(set[await detIndex(set.length)]);
  }
  for (let i = activeSets.length; i < config.length; i++) {
    chars.push(combined[await detIndex(combined.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = await detIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  seed.fill(0);

  const entropyBits = config.length * Math.log2(combined.length);
  const analysis = analyzeEntropyLocal(
    entropyBits,
    "vaultDerived",
    combined.length
  );

  return {
    item: {
      value: chars.join(""),
      entropyBits,
      mode: "vaultDerived",
    },
    effectiveAlphabetSize: combined.length,
    analysis,
    kdfSpec: "WebCrypto PBKDF2-SHA256 (en app nativa usa Argon2id 64 MiB)",
    masterFingerprint: fingerprint,
  };
}

function normalizeLeetspeak(s: string): string {
  const map: Record<string, string> = {
    "0": "o",
    "1": "i",
    "!": "i",
    "3": "e",
    "4": "a",
    "@": "a",
    "5": "s",
    $: "s",
    "7": "t",
    "8": "b",
  };
  return [...s.toLowerCase()].map((c) => map[c] ?? c).join("");
}

function findKeyboardWalkLen(lower: string): number {
  let best = 0;
  for (const row of KEYBOARD_ROWS) {
    const rev = [...row].reverse().join("");
    for (const pat of [row, rev]) {
      for (let winLen = Math.min(pat.length, lower.length); winLen >= 3; winLen--) {
        if (winLen <= best) break;
        for (let start = 0; start <= pat.length - winLen; start++) {
          if (lower.includes(pat.slice(start, start + winLen))) {
            best = winLen;
            break;
          }
        }
      }
    }
  }
  return best;
}

function longestSequentialRun(chars: string[]): number {
  if (chars.length < 3) return 0;
  let maxRun = 1;
  let curRun = 1;
  let prevDiff: number | null = null;
  for (let i = 1; i < chars.length; i++) {
    const a = chars[i - 1].toLowerCase();
    const b = chars[i].toLowerCase();
    const sameClass =
      (/[a-z]/.test(a) && /[a-z]/.test(b)) ||
      (/[0-9]/.test(a) && /[0-9]/.test(b));
    if (sameClass) {
      const diff = b.charCodeAt(0) - a.charCodeAt(0);
      if (diff === 1 || diff === -1) {
        if (prevDiff === diff) {
          curRun += 1;
        } else {
          curRun = 2;
          prevDiff = diff;
        }
        maxRun = Math.max(maxRun, curRun);
        continue;
      }
    }
    curRun = 1;
    prevDiff = null;
  }
  return maxRun >= 3 ? maxRun : 0;
}

function shannonEntropyBits(chars: string[]): number {
  if (chars.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const c of chars) {
    freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  let h = 0;
  for (const count of freq.values()) {
    const p = count / chars.length;
    h -= p * Math.log2(p);
  }
  return h * chars.length;
}

export function analyzeCustomSecretFallback(secret: string): SecurityAnalysis {
  const chars = [...secret];
  const len = chars.length;
  if (len === 0) return analyzeEntropyLocal(0, "password", 0);

  let alphabet = 0;
  const hasLower = /[a-z]/.test(secret);
  const hasUpper = /[A-Z]/.test(secret);
  const hasDigit = /[0-9]/.test(secret);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(secret);
  const hasSpace = /\s/.test(secret);
  if (hasLower) alphabet += 26;
  if (hasUpper) alphabet += 26;
  if (hasDigit) alphabet += 10;
  if (hasSymbol) alphabet += 32;
  if (hasSpace) alphabet += 1;

  const bitsPerChar = alphabet > 1 ? Math.log2(alphabet) : 0;
  const theoreticalBits = len * bitsPerChar;

  const penalties: EntropyPenalty[] = [];
  let totalPenalty = 0;
  let hardCap: number | null = null;

  const lower = secret.toLowerCase();
  const leet = normalizeLeetspeak(secret);
  const cleanAlpha = leet.replace(/[^a-z]/g, "");

  const exactCommon = COMMON_WEAK_WORDS.some(
    (w) =>
      lower === w ||
      leet === w ||
      (cleanAlpha === w && len <= w.length + 4)
  );

  if (exactCommon) {
    const cap = lower === cleanAlpha ? 10 : 18;
    const loss = Math.max(theoreticalBits - cap, 0);
    if (loss > 0.5) {
      penalties.push({
        code: "common_password",
        label: "Contraseña Común / Filtrada",
        bitsLost: Math.round(loss * 10) / 10,
        detail:
          "Coincide con palabras o claves frecuentes en diccionarios de ataques (incluyendo leetspeak).",
      });
      hardCap = hardCap === null ? cap : Math.min(hardCap, cap);
    }
  } else {
    let matchedWord: string | null = null;
    for (const w of COMMON_WEAK_WORDS) {
      if (w.length >= 4 && (lower.includes(w) || leet.includes(w))) {
        if (!matchedWord || w.length > matchedWord.length) matchedWord = w;
      }
    }
    if (matchedWord) {
      const loss = Math.max(matchedWord.length * bitsPerChar - 11, 8);
      totalPenalty += loss;
      penalties.push({
        code: "dictionary_word",
        label: "Palabra de Diccionario",
        bitsLost: Math.round(loss * 10) / 10,
        detail: `Contiene la palabra predecible "${matchedWord}" (detectada incluso con leetspeak).`,
      });
    }
  }

  const kbLen = findKeyboardWalkLen(lower);
  if (kbLen >= 4) {
    const loss = Math.max(kbLen * bitsPerChar - 6, 10);
    totalPenalty += loss;
    penalties.push({
      code: "keyboard_walk",
      label: "Patrón de Teclado (QWERTY)",
      bitsLost: Math.round(loss * 10) / 10,
      detail: `Secuencia de ${kbLen} teclas adyacentes en el teclado.`,
    });
  }

  const seqLen = longestSequentialRun(chars);
  if (seqLen >= 3) {
    const loss = Math.max(seqLen * bitsPerChar - 4, 8);
    totalPenalty += loss;
    penalties.push({
      code: "sequence",
      label: "Secuencia Alfanumérica",
      bitsLost: Math.round(loss * 10) / 10,
      detail: `Secuencia ordenada de ${seqLen} caracteres consecutivos (ej. 1234 o abcd).`,
    });
  }

  const uniqueCount = new Set(chars).size;
  const hasTripleRepeat = /(.)\1\1/.test(secret);
  const hasChunkRepeat = /(.{2,})\1/.test(secret);
  if (hasTripleRepeat || hasChunkRepeat) {
    const loss = Math.max(2.5 * bitsPerChar, 10);
    totalPenalty += loss;
    penalties.push({
      code: "repetition",
      label: "Caracteres o Bloques Repetidos",
      bitsLost: Math.round(loss * 10) / 10,
      detail: "Contiene repeticiones consecutivas que reducen la imprevisibilidad real.",
    });
  }

  if (len >= 6) {
    if (uniqueCount <= 2) {
      const cap = Math.log2(len) + 3;
      const loss = Math.max(theoreticalBits - cap, 0);
      if (loss > 1) {
        penalties.push({
          code: "extreme_low_diversity",
          label: "Diversidad Críticamente Baja",
          bitsLost: Math.round(loss * 10) / 10,
          detail: `Solo usa ${uniqueCount} carácter(es) único(s) en ${len} posiciones.`,
        });
        hardCap = hardCap === null ? cap : Math.min(hardCap, cap);
      }
    } else if (uniqueCount / len < 0.55) {
      const shannon = shannonEntropyBits(chars);
      const effectiveCap = Math.max(
        shannon * 1.45,
        uniqueCount * bitsPerChar * 0.9
      );
      if (effectiveCap < theoreticalBits - 6) {
        const loss = theoreticalBits - effectiveCap;
        totalPenalty += loss;
        penalties.push({
          code: "low_diversity",
          label: "Baja Diversidad (Shannon)",
          bitsLost: Math.round(loss * 10) / 10,
          detail: `Solo ${uniqueCount} caracteres únicos de ${len}; entropía de Shannon baja (${shannon.toFixed(1)} bits).`,
        });
      }
    }
  }

  if (/(19\d{2}|20\d{2})/.test(secret)) {
    const loss = Math.max(4 * bitsPerChar - 7.5, 7);
    totalPenalty += loss;
    penalties.push({
      code: "date_year",
      label: "Año o Fecha Detectada",
      bitsLost: Math.round(loss * 10) / 10,
      detail: "Contiene un año (1900–2099) o fecha predecible.",
    });
  }

  const firstUpperOnly =
    /^[A-Z]/.test(secret) && (secret.slice(1).match(/[A-Z]/g)?.length ?? 0) === 0;
  const trailingSymOnly =
    /[^a-zA-Z0-9\s]$/.test(secret) &&
    (secret.slice(0, -1).match(/[^a-zA-Z0-9\s]/g)?.length ?? 0) === 0;
  if (len >= 6 && firstUpperOnly && trailingSymOnly && hasDigit && penalties.length > 0) {
    totalPenalty += 12;
    penalties.push({
      code: "human_rule",
      label: "Regla Humana Predecible",
      bitsLost: 12,
      detail: "Patrón clásico Mayúscula-inicial + dígitos + símbolo-final (!/?/@).",
    });
  }

  let realBits = Math.max(theoreticalBits - totalPenalty, 0);
  if (hardCap !== null) realBits = Math.min(realBits, hardCap);

  const result = analyzeEntropyLocal(realBits, "password", alphabet);
  result.theoreticalEntropyBits = Math.round(theoreticalBits * 100) / 100;
  result.penalties = penalties;

  if (len < 12) {
    result.recommendations.unshift(
      "Longitud corta (< 12 caracteres): usa al menos 16–24 caracteres aleatorios o una frase Diceware de 6+ palabras."
    );
  }
  if (penalties.length > 0) {
    const lost = Math.max(result.theoreticalEntropyBits - result.entropyBits, 0);
    result.recommendations.unshift(
      `Se penalizaron -${lost.toFixed(1)} bits por patrones humanos/predecibles. Genera una clave aleatoria con CSPRNG.`
    );
  }

  return result;
}

/**
 * Unified async bridge: invokes native Rust `ciphergen-core` inside Tauri 2,
 * or falls back to Web Crypto CSPRNG in browser/test environments.
 */
async function invokeTauri<T>(
  cmd: string,
  args: Record<string, unknown>
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export async function generatePasswords(
  config: PasswordConfig
): Promise<PasswordBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<PasswordBatchResult>("generate_passwords_cmd", { config });
  }
  return generatePasswordsFallback(config);
}

export async function generatePassphrases(
  config: PassphraseConfig
): Promise<PassphraseBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<PassphraseBatchResult>("generate_passphrases_cmd", {
      config,
    });
  }
  return generatePassphrasesFallback(config);
}

export async function generatePins(config: PinConfig): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_pins_cmd", { config });
  }
  return generatePinsFallback(config);
}

export async function generateKeys(config: KeyConfig): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_keys_cmd", { config });
  }
  return generateKeysFallback(config);
}

export async function generateUuids(
  config: UuidConfig
): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_uuids_cmd", { config });
  }
  return generateUuidsFallback(config);
}

export async function generateBip39(
  config: Bip39Config
): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_bip39_cmd", { config });
  }
  return generateBip39Fallback(config);
}

export async function generateRecoveryCodes(
  config: RecoveryCodeConfig
): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_recovery_codes_cmd", { config });
  }
  return generateRecoveryCodesFallback(config);
}

export async function deriveVaultPassword(
  config: VaultConfig
): Promise<VaultResult> {
  if (isTauriRuntime()) {
    return invokeTauri<VaultResult>("derive_vault_password_cmd", { config });
  }
  return deriveVaultPasswordFallback(config);
}

export async function computeMasterFingerprint(
  masterPassword: string
): Promise<MasterFingerprint> {
  if (isTauriRuntime()) {
    return invokeTauri<MasterFingerprint>("compute_master_fingerprint_cmd", {
      masterPassword,
    });
  }
  return computeMasterFingerprintFallback(masterPassword);
}

export async function analyzeCustomSecret(
  secret: string
): Promise<SecurityAnalysis> {
  if (isTauriRuntime()) {
    return invokeTauri<SecurityAnalysis>("analyze_secret_cmd", { secret });
  }
  return analyzeCustomSecretFallback(secret);
}
