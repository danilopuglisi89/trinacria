// TRINACRIA — nomi di luoghi (solo etichette, non territori): geografia, coste, siti storici
// [nome, lat, lon, tipo, zMin]  tipo: catena|monte|fiume|lago|cascata|capo|golfo|stretto|sito|piana|zona|isola
// zMin = zoom minimo per mostrarlo (più alto = compare solo avvicinandosi)
window.DATA_LUOGHI = [
  // --- Laghi (gli stessi scavati sulla mappa in map.js: LAGHI) ---
  ["Lago di Pergusa", 37.515, 14.305, "lago", 8],
  ["Lago Pozzillo", 37.655, 14.650, "lago", 8],
  ["Lago Ancipa", 37.830, 14.600, "lago", 9],
  ["Lago Arancio", 37.610, 13.150, "lago", 9],
  ["Lago Rosamarina", 37.900, 13.500, "lago", 9],
  ["Lago Ogliastro", 37.420, 14.550, "lago", 9],
  ["Lago Disueri", 37.150, 14.200, "lago", 9],
  ["Lago Poma", 38.020, 13.130, "lago", 9],
  ["Biviere di Gela", 37.030, 14.350, "lago", 9],
  ["Lago di Piana degli Albanesi", 37.980, 13.280, "lago", 9],
  // --- Altri rilievi e valli ---
  ["Monte Etna", 37.755, 14.995, "monte", 4],
  ["Monte Soro", 37.925, 14.680, "monte", 9],
  ["Pizzo dell'Antenna", 37.865, 14.030, "monte", 10],
  ["Monte Cammarata", 37.640, 13.640, "monte", 9],
  ["Monte Cofano", 38.100, 12.690, "monte", 10],
  ["Valle del Belice", 37.700, 12.980, "zona", 7],
  ["Val di Noto", 36.980, 14.850, "zona", 6],
  ["Val Demone", 37.950, 14.900, "zona", 6],
  ["Val di Mazara", 37.750, 12.900, "zona", 6],
  ["Piana di Catania", 37.400, 14.920, "piana", 6],
  ["Piana di Gela", 37.080, 14.300, "piana", 7],
  ["Conca d'Oro", 38.130, 13.360, "piana", 7],
  // --- Coste, capi e golfi ---
  ["Capo Passero", 36.685, 15.135, "capo", 8],
  ["Capo Peloro", 38.265, 15.650, "capo", 8],
  ["Capo Lilibeo", 37.800, 12.435, "capo", 9],
  ["Capo Zafferano", 38.110, 13.535, "capo", 9],
  ["Golfo di Castellammare", 38.070, 12.880, "golfo", 6.5],
  ["Golfo di Termini", 37.990, 13.700, "golfo", 7],
  ["Scala dei Turchi", 37.290, 13.480, "sito", 9],
  ["Riserva dello Zingaro", 38.100, 12.800, "zona", 9],
  ["Oasi di Vendicari", 36.800, 15.110, "zona", 9],
  ["Gole dell'Alcantara", 37.880, 15.100, "sito", 9],
  ["Saline di Trapani", 37.960, 12.500, "zona", 8],
  // --- Siti storici ---
  ["Segesta", 37.940, 12.835, "sito", 8],
  ["Selinunte", 37.583, 12.825, "sito", 8],
  ["Villa del Casale", 37.365, 14.335, "sito", 9],
  ["Necropoli di Pantalica", 37.130, 15.020, "sito", 9],
  ["Mozia", 37.870, 12.470, "sito", 9],
  ["Cava d'Ispica", 36.820, 14.900, "sito", 9],
  ["Solunto", 38.090, 13.535, "sito", 10],
  ["Eraclea Minoa", 37.395, 13.285, "sito", 10],
  ["Morgantina", 37.430, 14.470, "sito", 10],
  ["Tindari", 38.145, 15.045, "sito", 9],
  // --- Catene e monti ---
  ["Monti Nebrodi", 37.90, 14.68, "catena", 4.5],
  ["Madonie", 37.86, 14.01, "catena", 4.5],
  ["Monti Peloritani", 38.10, 15.42, "catena", 5],
  ["Monti Iblei", 37.05, 14.88, "catena", 4.5],
  ["Monti Sicani", 37.62, 13.52, "catena", 5],
  ["Rocca Busambra", 37.85, 13.40, "monte", 8],
  ["Pizzo Carbonara", 37.885, 14.03, "monte", 9],
  ["Monte San Calogero", 37.58, 13.53, "monte", 9],
  ["Rocca di Cerere", 37.57, 14.28, "monte", 9],
  // --- Fiumi ---
  ["Fiume Simeto", 37.44, 14.95, "fiume", 6],
  ["Fiume Salso", 37.28, 13.98, "fiume", 6.5],
  ["Fiume Belice", 37.70, 12.95, "fiume", 6.5],
  ["Fiume Platani", 37.45, 13.35, "fiume", 7],
  ["Fiume Alcantara", 37.86, 15.10, "fiume", 7],
  ["Fiume Anapo", 37.08, 15.05, "fiume", 7.5],
  ["Fiume Dittaino", 37.52, 14.60, "fiume", 8],
  ["Fiume Gornalunga", 37.35, 14.75, "fiume", 8.5],
  // --- Laghi ---
  ["Laghetti di Marinello", 38.148, 14.970, "lago", 8.5],
  // --- Cascate e gole ---
  ["Cavagrande del Cassibile", 36.955, 15.106, "cascata", 8.5],
  // --- Parchi e riserve naturali ---
  ["Riserva di Vendicari", 36.798, 15.096, "zona", 7.5],
  ["Saline di Trapani e Paceco", 37.953, 12.472, "zona", 8],
  // --- Capi ---
  ["Capo San Vito", 38.18, 12.73, "capo", 7],
  ["Capo d'Orlando", 38.16, 14.75, "capo", 8],
  ["Capo Murro di Porco", 37.00, 15.32, "capo", 9],
  // --- Golfi e stretti ---
  ["Golfo di Palermo", 38.16, 13.38, "golfo", 6],
  ["Golfo di Catania", 37.38, 15.16, "golfo", 6],
  ["Golfo di Gela", 37.02, 14.22, "golfo", 6.5],
  ["Stretto di Messina", 38.18, 15.60, "stretto", 5],
  // --- Piane e zone ---
  // --- Siti storici e archeologici ---
  ["Valle dei Templi", 37.290, 13.585, "sito", 6],
  ["Teatro di Taormina", 37.852, 15.292, "sito", 8],
  ["Neapolis di Siracusa", 37.076, 15.276, "sito", 8],
  ["Akrai", 37.065, 14.905, "sito", 9],
  ["Cappella Palatina", 38.111, 13.353, "sito", 9],
  ["Teatro Massimo", 38.122, 13.361, "sito", 9],
  ["Duomo di Siracusa", 37.058, 15.293, "sito", 8.5],
  ["Castello Ursino", 37.497, 15.083, "sito", 9],
  ["Cretto di Burri", 37.845, 12.905, "sito", 8.5]
];
