export interface OFFUser {
  id: string;
  name: string;
  avatar: string;
  rank: number;
  rankLabel: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  productsCreated: number;
  productsModified: number;
  recentActivity: { action: "created" | "modified"; product: string; barcode: string; date: string }[];
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  members: number;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  category: "general" | "regional" | "topic";
}

export interface OFFEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: "scan" | "meetup" | "hackathon" | "webinar";
  attendees: number;
  description: string;
}

export interface Conversation {
  id: string;
  with: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  members?: number;
  zone?: string;
}

// ── Utilisateurs Marseille (12) ──────────────────────────────────────────────
const marseille: OFFUser[] = [
  { id: "m1",  name: "Camille Aubry",     avatar: "CA", rank: 4,  rankLabel: "Contributeur Senior", lat: 43.2965, lng: 5.3698, country: "France", city: "Marseille", productsCreated: 820, productsModified: 2100, recentActivity: [{ action: "created", product: "Pastis Henri Bardouin", barcode: "3500610014594", date: "2026-05-26" }] },
  { id: "m2",  name: "Théo Bonnet",       avatar: "TB", rank: 7,  rankLabel: "Contributeur",        lat: 43.2980, lng: 5.3710, country: "France", city: "Marseille", productsCreated: 410, productsModified: 890,  recentActivity: [{ action: "modified", product: "Savon de Marseille", barcode: "3660180000123", date: "2026-05-25" }] },
  { id: "m3",  name: "Inès Fabre",        avatar: "IF", rank: 9,  rankLabel: "Contributeur",        lat: 43.2940, lng: 5.3670, country: "France", city: "Marseille", productsCreated: 290, productsModified: 610,  recentActivity: [{ action: "created", product: "Bouillabaisse surgelée", barcode: "3270140003012", date: "2026-05-24" }] },
  { id: "m4",  name: "Noah Girard",       avatar: "NG", rank: 11, rankLabel: "Contributeur",        lat: 43.3010, lng: 5.3720, country: "France", city: "Marseille", productsCreated: 230, productsModified: 540,  recentActivity: [{ action: "created", product: "Navettes de Marseille", barcode: "3329820001234", date: "2026-05-26" }] },
  { id: "m5",  name: "Léa Perrin",        avatar: "LP", rank: 13, rankLabel: "Explorateur",         lat: 43.2950, lng: 5.3740, country: "France", city: "Marseille", productsCreated: 175, productsModified: 320,  recentActivity: [{ action: "modified", product: "Tapenade noire", barcode: "3229820054321", date: "2026-05-23" }] },
  { id: "m6",  name: "Julien Roux",       avatar: "JR", rank: 17, rankLabel: "Explorateur",         lat: 43.2920, lng: 5.3660, country: "France", city: "Marseille", productsCreated: 140, productsModified: 280,  recentActivity: [{ action: "created", product: "Socca Niçoise", barcode: "3760012340012", date: "2026-05-22" }] },
  { id: "m7",  name: "Manon Blanc",       avatar: "MB", rank: 19, rankLabel: "Explorateur",         lat: 43.2990, lng: 5.3680, country: "France", city: "Marseille", productsCreated: 120, productsModified: 245,  recentActivity: [{ action: "modified", product: "Huile d'olive AOP", barcode: "3256220013478", date: "2026-05-21" }] },
  { id: "m8",  name: "Raphaël Duval",     avatar: "RD", rank: 22, rankLabel: "Novice",              lat: 43.2960, lng: 5.3720, country: "France", city: "Marseille", productsCreated: 88,  productsModified: 190,  recentActivity: [{ action: "created", product: "Pissaladière", barcode: "3760098765432", date: "2026-05-20" }] },
  { id: "m9",  name: "Chloé Morin",       avatar: "CM", rank: 24, rankLabel: "Novice",              lat: 43.2975, lng: 5.3650, country: "France", city: "Marseille", productsCreated: 72,  productsModified: 160,  recentActivity: [{ action: "created", product: "Fromage de chèvre local", barcode: "3329800098765", date: "2026-05-19" }] },
  { id: "m10", name: "Antoine Legrand",   avatar: "AL", rank: 26, rankLabel: "Novice",              lat: 43.3000, lng: 5.3700, country: "France", city: "Marseille", productsCreated: 55,  productsModified: 110,  recentActivity: [{ action: "modified", product: "Pastis 51", barcode: "3123450000120", date: "2026-05-18" }] },
  { id: "m11", name: "Zoé Lambert",       avatar: "ZL", rank: 28, rankLabel: "Novice",              lat: 43.2935, lng: 5.3750, country: "France", city: "Marseille", productsCreated: 41,  productsModified: 85,   recentActivity: [{ action: "created", product: "Anchois de Collioure", barcode: "3256225991234", date: "2026-05-17" }] },
  { id: "m12", name: "Baptiste Colin",    avatar: "BC", rank: 30, rankLabel: "Novice",              lat: 43.2908, lng: 5.3690, country: "France", city: "Marseille", productsCreated: 28,  productsModified: 60,   recentActivity: [{ action: "created", product: "Calisson d'Aix", barcode: "3280970001234", date: "2026-05-16" }] },
];

// ── Utilisateurs PACA hors Marseille (22) ───────────────────────────────────
const paca: OFFUser[] = [
  // Nice
  { id: "p1",  name: "Yasmine Ferrat",    avatar: "YF", rank: 6,  rankLabel: "Contributeur",  lat: 43.7102, lng: 7.2620, country: "France", city: "Nice",              productsCreated: 360, productsModified: 780,  recentActivity: [{ action: "created", product: "Socca au pois chiche", barcode: "3760150001234", date: "2026-05-26" }] },
  { id: "p2",  name: "Marc Estève",       avatar: "ME", rank: 14, rankLabel: "Explorateur",   lat: 43.7120, lng: 7.2640, country: "France", city: "Nice",              productsCreated: 155, productsModified: 300,  recentActivity: [{ action: "modified", product: "Huile de truffe", barcode: "3256789001234", date: "2026-05-25" }] },
  { id: "p3",  name: "Clara Remy",        avatar: "CR", rank: 21, rankLabel: "Novice",        lat: 43.7090, lng: 7.2600, country: "France", city: "Nice",              productsCreated: 65,  productsModified: 140,  recentActivity: [{ action: "created", product: "Pan bagnat", barcode: "3760180001234", date: "2026-05-24" }] },
  // Toulon
  { id: "p4",  name: "Éric Maunier",      avatar: "EM", rank: 10, rankLabel: "Contributeur",  lat: 43.1258, lng: 5.9306, country: "France", city: "Toulon",            productsCreated: 245, productsModified: 520,  recentActivity: [{ action: "created", product: "Brandade de morue", barcode: "3256223091234", date: "2026-05-26" }] },
  { id: "p5",  name: "Nadia Vidal",       avatar: "NV", rank: 23, rankLabel: "Novice",        lat: 43.1240, lng: 5.9280, country: "France", city: "Toulon",            productsCreated: 80,  productsModified: 165,  recentActivity: [{ action: "modified", product: "Tian provençal", barcode: "3329800091111", date: "2026-05-23" }] },
  // Aix-en-Provence
  { id: "p6",  name: "Hugo Cassagne",     avatar: "HC", rank: 16, rankLabel: "Explorateur",   lat: 43.5297, lng: 5.4474, country: "France", city: "Aix-en-Provence",  productsCreated: 130, productsModified: 270,  recentActivity: [{ action: "created", product: "Calisson AOP", barcode: "3280970004321", date: "2026-05-26" }] },
  { id: "p7",  name: "Adèle Pons",        avatar: "AP", rank: 27, rankLabel: "Novice",        lat: 43.5315, lng: 5.4490, country: "France", city: "Aix-en-Provence",  productsCreated: 50,  productsModified: 105,  recentActivity: [{ action: "modified", product: "Huile d'olive Vallée des Baux", barcode: "3256223001234", date: "2026-05-22" }] },
  // Avignon
  { id: "p8",  name: "Franck Olive",      avatar: "FO", rank: 18, rankLabel: "Explorateur",   lat: 43.9493, lng: 4.8055, country: "France", city: "Avignon",           productsCreated: 115, productsModified: 240,  recentActivity: [{ action: "created", product: "Lavande AOP", barcode: "3280970009876", date: "2026-05-25" }] },
  { id: "p9",  name: "Lucie Arnaud",      avatar: "LA", rank: 31, rankLabel: "Novice",        lat: 43.9510, lng: 4.8070, country: "France", city: "Avignon",           productsCreated: 35,  productsModified: 70,   recentActivity: [{ action: "modified", product: "Vin Côtes du Rhône", barcode: "3500270001234", date: "2026-05-21" }] },
  // Cannes
  { id: "p10", name: "Victor Moulin",     avatar: "VM", rank: 25, rankLabel: "Novice",        lat: 43.5528, lng: 7.0174, country: "France", city: "Cannes",            productsCreated: 60,  productsModified: 130,  recentActivity: [{ action: "created", product: "Mimosa confit", barcode: "3760199001234", date: "2026-05-24" }] },
  { id: "p11", name: "Émilie Sartre",     avatar: "ES", rank: 33, rankLabel: "Novice",        lat: 43.5510, lng: 7.0160, country: "France", city: "Cannes",            productsCreated: 25,  productsModified: 55,   recentActivity: [{ action: "created", product: "Lemon curd Riviera", barcode: "3760210001234", date: "2026-05-23" }] },
  // Arles
  { id: "p12", name: "Paul Jourdain",     avatar: "PJ", rank: 29, rankLabel: "Novice",        lat: 43.6763, lng: 4.6278, country: "France", city: "Arles",             productsCreated: 48,  productsModified: 100,  recentActivity: [{ action: "modified", product: "Riz de Camargue", barcode: "3256225098765", date: "2026-05-25" }] },
  { id: "p13", name: "Sarah Teissier",    avatar: "ST", rank: 35, rankLabel: "Novice",        lat: 43.6745, lng: 4.6260, country: "France", city: "Arles",             productsCreated: 22,  productsModified: 48,   recentActivity: [{ action: "created", product: "Fleur de sel de Camargue", barcode: "3256225054321", date: "2026-05-22" }] },
  // Gap
  { id: "p14", name: "Laurent Imbert",    avatar: "LI", rank: 32, rankLabel: "Novice",        lat: 44.5594, lng: 6.0820, country: "France", city: "Gap",               productsCreated: 33,  productsModified: 72,   recentActivity: [{ action: "created", product: "Fromage Banon AOP", barcode: "3256770001234", date: "2026-05-21" }] },
  // Digne-les-Bains
  { id: "p15", name: "Mathieu Astier",    avatar: "MA", rank: 36, rankLabel: "Novice",        lat: 44.0921, lng: 6.2356, country: "France", city: "Digne-les-Bains",   productsCreated: 20,  productsModified: 44,   recentActivity: [{ action: "created", product: "Lavande vraie", barcode: "3760230001234", date: "2026-05-20" }] },
  // Fréjus
  { id: "p16", name: "Audrey Perret",     avatar: "APt", rank: 34, rankLabel: "Novice",       lat: 43.4333, lng: 6.7375, country: "France", city: "Fréjus",            productsCreated: 27,  productsModified: 58,   recentActivity: [{ action: "modified", product: "Tarte tropézienne", barcode: "3256225043210", date: "2026-05-19" }] },
  // Antibes
  { id: "p17", name: "Kevin Moureau",     avatar: "KM", rank: 37, rankLabel: "Novice",        lat: 43.5804, lng: 7.1283, country: "France", city: "Antibes",           productsCreated: 19,  productsModified: 40,   recentActivity: [{ action: "created", product: "Confiture de figue", barcode: "3760240001234", date: "2026-05-18" }] },
  // Salon-de-Provence
  { id: "p18", name: "Florence Gilles",   avatar: "FG", rank: 38, rankLabel: "Novice",        lat: 43.6396, lng: 5.0979, country: "France", city: "Salon-de-Provence", productsCreated: 16,  productsModified: 35,   recentActivity: [{ action: "modified", product: "Huile d'olive AOC", barcode: "3256223011234", date: "2026-05-17" }] },
  // Martigues
  { id: "p19", name: "Romain Gervais",    avatar: "RG", rank: 40, rankLabel: "Novice",        lat: 43.4043, lng: 5.0524, country: "France", city: "Martigues",         productsCreated: 14,  productsModified: 30,   recentActivity: [{ action: "created", product: "Bouillabaisse maison", barcode: "3270140009876", date: "2026-05-16" }] },
  // Brignoles
  { id: "p20", name: "Océane Ferretti",   avatar: "OF", rank: 41, rankLabel: "Novice",        lat: 43.4050, lng: 6.0643, country: "France", city: "Brignoles",         productsCreated: 12,  productsModified: 26,   recentActivity: [{ action: "created", product: "Vin AOP Coteaux Varois", barcode: "3500280001234", date: "2026-05-15" }] },
  // Carpentras
  { id: "p21", name: "Sébastien Mayet",   avatar: "SM", rank: 42, rankLabel: "Novice",        lat: 44.0560, lng: 5.0480, country: "France", city: "Carpentras",        productsCreated: 10,  productsModified: 22,   recentActivity: [{ action: "created", product: "Berlingot de Carpentras", barcode: "3760250001234", date: "2026-05-14" }] },
  // Orange
  { id: "p22", name: "Delphine Rouzaud",  avatar: "DR", rank: 43, rankLabel: "Novice",        lat: 44.1381, lng: 4.8095, country: "France", city: "Orange",            productsCreated: 8,   productsModified: 18,   recentActivity: [{ action: "modified", product: "Tapenade verte", barcode: "3229820064321", date: "2026-05-13" }] },
];

// ── Utilisateurs France hors PACA (12) ──────────────────────────────────────
const france: OFFUser[] = [
  { id: "u1",  name: "Marie Dupont",      avatar: "MD", rank: 1,  rankLabel: "Explorateur Expert",  lat: 48.8566, lng: 2.3522, country: "France", city: "Paris",      productsCreated: 1240, productsModified: 3820, recentActivity: [{ action: "created", product: "Yaourt Nature Bio", barcode: "3760020507350", date: "2026-05-26" }, { action: "modified", product: "Beurre doux Président", barcode: "3228021120008", date: "2026-05-25" }] },
  { id: "u2",  name: "Sophie Martin",     avatar: "SM", rank: 2,  rankLabel: "Contributeur Senior", lat: 45.7640, lng: 4.8357, country: "France", city: "Lyon",       productsCreated: 980,  productsModified: 2150, recentActivity: [{ action: "created", product: "Quenelles de brochet", barcode: "3256225460099", date: "2026-05-25" }] },
  { id: "u3",  name: "Pierre Lefort",     avatar: "PL", rank: 3,  rankLabel: "Contributeur Senior", lat: 47.2184, lng: -1.5536, country: "France", city: "Nantes",    productsCreated: 760,  productsModified: 1890, recentActivity: [{ action: "created", product: "Muscadet sur lie", barcode: "3500290001234", date: "2026-05-24" }] },
  { id: "u4",  name: "Claire Bernard",    avatar: "CB", rank: 5,  rankLabel: "Contributeur",        lat: 44.8378, lng: -0.5792, country: "France", city: "Bordeaux",  productsCreated: 420,  productsModified: 990,  recentActivity: [{ action: "modified", product: "Saint-Émilion Grand Cru", barcode: "3500300001234", date: "2026-05-23" }] },
  { id: "u5",  name: "Adrien Clément",    avatar: "AC", rank: 8,  rankLabel: "Contributeur",        lat: 43.6047, lng: 1.4442, country: "France", city: "Toulouse",   productsCreated: 310,  productsModified: 670,  recentActivity: [{ action: "created", product: "Cassoulet de Castelnaudary", barcode: "3256221001234", date: "2026-05-25" }] },
  { id: "u6",  name: "Pauline Meyer",     avatar: "PM", rank: 12, rankLabel: "Explorateur",         lat: 48.5734, lng: 7.7521, country: "France", city: "Strasbourg", productsCreated: 200,  productsModified: 430,  recentActivity: [{ action: "created", product: "Choucroute garnie", barcode: "3256224001234", date: "2026-05-24" }] },
  { id: "u7",  name: "Thomas Hubert",     avatar: "TH", rank: 15, rankLabel: "Explorateur",         lat: 50.6292, lng: 3.0573, country: "France", city: "Lille",      productsCreated: 145,  productsModified: 280,  recentActivity: [{ action: "modified", product: "Maroilles AOP", barcode: "3256226001234", date: "2026-05-23" }] },
  { id: "u8",  name: "Julie Marchand",    avatar: "JM", rank: 20, rankLabel: "Novice",              lat: 47.3220, lng: 5.0415, country: "France", city: "Dijon",      productsCreated: 89,   productsModified: 150,  recentActivity: [{ action: "created", product: "Moutarde de Dijon", barcode: "3256227001234", date: "2026-05-22" }] },
  { id: "u9",  name: "Clément Rousseau",  avatar: "CR", rank: 39, rankLabel: "Novice",              lat: 45.1885, lng: 5.7245, country: "France", city: "Grenoble",   productsCreated: 13,   productsModified: 28,   recentActivity: [{ action: "created", product: "Gratin dauphinois", barcode: "3256228001234", date: "2026-05-21" }] },
  { id: "u10", name: "Marion Duplessis",  avatar: "MD", rank: 44, rankLabel: "Novice",              lat: 48.1173, lng: -1.6778, country: "France", city: "Rennes",    productsCreated: 7,    productsModified: 15,   recentActivity: [{ action: "created", product: "Kouign-amann", barcode: "3256229001234", date: "2026-05-20" }] },
  { id: "u11", name: "Nicolas Garnier",   avatar: "NG", rank: 45, rankLabel: "Novice",              lat: 43.2965, lng: 5.3813, country: "France", city: "Montpellier", productsCreated: 6,   productsModified: 12,   recentActivity: [{ action: "modified", product: "Picpoul de Pinet", barcode: "3500310001234", date: "2026-05-19" }] },
  { id: "u12", name: "Elisa Fontaine",    avatar: "EF", rank: 46, rankLabel: "Novice",              lat: 49.4431, lng: 1.0993, country: "France", city: "Rouen",      productsCreated: 5,    productsModified: 10,   recentActivity: [{ action: "created", product: "Andouille de Vire", barcode: "3256230001234", date: "2026-05-18" }] },
];

// ── Reste du monde ───────────────────────────────────────────────────────────
const world: OFFUser[] = [
  { id: "w1", name: "Carlos García",  avatar: "CG", rank: 2,  rankLabel: "Contributeur Senior", lat: 40.4168, lng: -3.7038, country: "Espagne",      city: "Madrid",    productsCreated: 980,  productsModified: 2150, recentActivity: [{ action: "modified", product: "Chorizo Ibérico", barcode: "8410169032138", date: "2026-05-26" }] },
  { id: "w2", name: "Emma Schmidt",   avatar: "ES", rank: 3,  rankLabel: "Contributeur Senior", lat: 52.5200, lng: 13.4050, country: "Allemagne",    city: "Berlin",    productsCreated: 760,  productsModified: 1890, recentActivity: [{ action: "created", product: "Bio-Müsli Früchte", barcode: "4005500313052", date: "2026-05-25" }] },
  { id: "w3", name: "Luca Rossi",     avatar: "LR", rank: 5,  rankLabel: "Contributeur",        lat: 41.9028, lng: 12.4964, country: "Italie",       city: "Rome",      productsCreated: 420,  productsModified: 990,  recentActivity: [{ action: "created", product: "Parmigiano Reggiano 24m", barcode: "8007853000032", date: "2026-05-26" }] },
  { id: "w4", name: "James Wilson",   avatar: "JW", rank: 12, rankLabel: "Explorateur",         lat: 51.5074, lng: -0.1278, country: "Royaume-Uni",  city: "Londres",   productsCreated: 200,  productsModified: 430,  recentActivity: [{ action: "modified", product: "Cadbury Dairy Milk", barcode: "7622201493517", date: "2026-05-26" }] },
  { id: "w5", name: "Ana Oliveira",   avatar: "AO", rank: 15, rankLabel: "Explorateur",         lat: 38.7167, lng: -9.1333, country: "Portugal",     city: "Lisbonne",  productsCreated: 145,  productsModified: 280,  recentActivity: [{ action: "created", product: "Pastel de nata", barcode: "5601087000014", date: "2026-05-23" }] },
  { id: "w6", name: "Pieter van Dijk",avatar: "PV", rank: 20, rankLabel: "Novice",              lat: 52.3676, lng: 4.9041,  country: "Pays-Bas",     city: "Amsterdam", productsCreated: 89,   productsModified: 150,  recentActivity: [{ action: "created", product: "Gouda Jong 48+", barcode: "8718452012048", date: "2026-05-21" }] },
];

export const mockUsers: OFFUser[] = [...marseille, ...paca, ...france, ...world];

export const mockChannels: Channel[] = [
  { id: "c1", name: "# général",              description: "Discussions générales de la communauté Open Food Facts", members: 4821, lastMessage: "Marie: N'oubliez pas la mise à jour des scores Nutri-Score !", lastMessageTime: "il y a 5 min",  unread: 12, category: "general"  },
  { id: "c2", name: "# nouveaux-contributeurs",description: "Aide et bienvenue pour les nouveaux membres",           members: 1203, lastMessage: "Carlos: Comment ajouter un allergène sur un produit ?",           lastMessageTime: "il y a 20 min", unread: 3,  category: "general"  },
  { id: "c3", name: "# france",               description: "Communauté française Open Food Facts",                  members: 2140, lastMessage: "Sophie: Salon de l'agriculture 2026 confirmé !",                  lastMessageTime: "il y a 1h",     unread: 0,  category: "regional" },
  { id: "c4", name: "# europe",               description: "Coordination des équipes européennes",                  members: 890,  lastMessage: "Emma: Revue du règlement UE 2025/1234",                           lastMessageTime: "il y a 2h",     unread: 5,  category: "regional" },
  { id: "c5", name: "# nutri-score",          description: "Discussion sur le Nutri-Score et NOVA",                 members: 654,  lastMessage: "Pieter: Nouvelle formule Nutri-Score B appliquée ?",              lastMessageTime: "il y a 3h",     unread: 0,  category: "topic"    },
  { id: "c6", name: "# scan-parties",         description: "Organisation de scan-parties locales",                 members: 432,  lastMessage: "Luca: Scan-party à Rome le 7 juin !",                             lastMessageTime: "il y a 5h",     unread: 2,  category: "topic"    },
];

export const mockEvents: OFFEvent[] = [
  { id: "e1", title: "Scan-Party Paris — Marché d'Aligre",   date: "2026-06-07", time: "10:00 - 14:00", location: "Paris, France",       type: "scan",      attendees: 34,  description: "Venez scanner avec nous les produits du marché d'Aligre pour enrichir la base Open Food Facts." },
  { id: "e2", title: "Hackathon Open Food Facts Europe",      date: "2026-06-14", time: "09:00 - 18:00", location: "Bruxelles, Belgique", type: "hackathon", attendees: 120, description: "48h pour développer de nouvelles fonctionnalités et améliorer l'application mobile." },
  { id: "e3", title: "Webinaire : Nutri-Score v2 expliqué",   date: "2026-06-18", time: "18:30 - 19:30", location: "En ligne",            type: "webinar",   attendees: 280, description: "Comprendre les changements du Nutri-Score version 2 et leur impact sur les contributeurs." },
  { id: "e4", title: "Meetup Berlin — Komunität",             date: "2026-07-02", time: "19:00 - 21:00", location: "Berlin, Allemagne",   type: "meetup",    attendees: 45,  description: "Rencontre informelle de la communauté germanophone autour d'une bière et de produits bio." },
  { id: "e5", title: "Scan-Party Marseille — Marché Noailles",date: "2026-07-12", time: "11:00 - 15:00", location: "Marseille, France",   type: "scan",      attendees: 28,  description: "Scan des produits méditerranéens au marché Noailles de Marseille." },
];

export const mockConversations: Conversation[] = [
  { id: "d1", with: "Camille Aubry",           avatar: "CA",  lastMessage: "Merci pour le conseil sur les catégories !", time: "10:32", unread: 1, isGroup: false },
  { id: "d2", with: "Communauté PACA",         avatar: "PAC", lastMessage: "Théo: Réunion virtuelle jeudi 19h",           time: "09:15", unread: 4, isGroup: true, members: 34, zone: "PACA" },
  { id: "d3", with: "Emma Schmidt",            avatar: "ES",  lastMessage: "Vous avez vu la nouvelle API ?",              time: "Hier",  unread: 0, isGroup: false },
  { id: "d4", with: "Groupe Europe Centrale",  avatar: "EC",  lastMessage: "Pieter: On se retrouve à Bruxelles ?",        time: "Hier",  unread: 0, isGroup: true, members: 213, zone: "Europe Centrale" },
  { id: "d5", with: "Communauté Marseille",    avatar: "MRS", lastMessage: "Inès: Scan-party samedi matin !",             time: "Lun.",  unread: 2, isGroup: true, members: 12, zone: "Marseille" },
];
