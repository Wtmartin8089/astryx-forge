/**
 * LUG ICON System ship class data.
 * Source: The Price of Freedom – The United Federation of Planets Sourcebook
 *         Last Unicorn Games (LUG25100), 1999
 *
 * Structure mirrors the printed stat blocks exactly.
 * Weapons range tuple: [contact_km, short_km, medium_km, long_km]
 * Accuracy tuple:      [contact, short, medium, long]  (target number to beat)
 * Shield protection:   [standard, reinforced]
 */

export interface LUGWeapon {
  name: string;
  type: "phaser" | "torpedo" | "cannon";
  range: [number, number, number, number];
  arc: string;
  accuracy: [number, number, number, number];
  damage: number;
  power: number;
  weaponsSkill: number;
  // torpedo-only fields
  number?: number;
  launchers?: string;
  spread?: number;
}

export interface LUGShipClass {
  className: string;
  fullType: string;
  commissioningDate: number;
  hull: {
    size: number;
    lengthMeters: number;
    decks: number;
    resistance: number;
    structuralPoints: number;
  };
  operations: {
    crew: number;
    passengers: number;
    evacuation: number;
    crewPower: number;
    computers: number;
    computersPower: number;
    transporters: { personnel: number; cargo: number; emergency: number; power: number };
    tractorBeams: string;
  };
  propulsion: {
    warp: {
      cruising: number;
      standard: number;
      maximum: number;
      maxDuration: string;
      powerPerFactor: number;
    };
    impulse: {
      cruising: string;
      maximum: string;
      powerCruising: number;
      powerMaximum: number;
    };
    totalPower: number;
  };
  sensors: {
    longRange: { bonus: number; rangeLY: number; power: number };
    lateral: { bonus: number; rangeLY: number; power: number };
    navigational: { bonus: number; power: number };
    skill: number;
  };
  weapons: LUGWeapon[];
  shields: { protection: number; reinforced: number; power: number };
}

export const LUG_SHIP_CLASSES: Record<string, LUGShipClass> = {

  // ─── AKIRA ───────────────────────────────────────────────────────────────────
  "akira": {
    className: "Akira",
    fullType: "Akira-class Heavy Attack Cruiser",
    commissioningDate: 2368,
    hull: { size: 7, lengthMeters: 464, decks: 16, resistance: 5, structuralPoints: 140 },
    operations: {
      crew: 500, passengers: 750, evacuation: 4500, crewPower: 5,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 5 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.6, maximum: 9.8, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 210,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type X Phaser Array", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 200, launchers: "3 ad, 1 fv", spread: 10,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 60, reinforced: 80, power: 60 },
  },

  // ─── APOLLO ──────────────────────────────────────────────────────────────────
  "apollo": {
    className: "Apollo",
    fullType: "Apollo-class Light Cruiser",
    commissioningDate: 2325,
    hull: { size: 5, lengthMeters: 315, decks: 16, resistance: 3, structuralPoints: 100 },
    operations: {
      crew: 100, passengers: 700, evacuation: 2500, crewPower: 6,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 3, emergency: 3, power: 5 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.2, maximum: 9.6, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 160,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 5 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VIII Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 16, power: 16, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 150, launchers: "1 ad, 1 fv", spread: 4,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 4,
      },
    ],
    shields: { protection: 50, reinforced: 70, power: 50 },
  },

  // ─── CONSTELLATION ───────────────────────────────────────────────────────────
  "constellation": {
    className: "Constellation",
    fullType: "Constellation-class Exploratory Cruiser",
    commissioningDate: 2304,
    hull: { size: 5, lengthMeters: 302, decks: 17, resistance: 3, structuralPoints: 100 },
    operations: {
      crew: 350, passengers: 1500, evacuation: 3500, crewPower: 6,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.5, standard: 9.0, maximum: 9.2, maxDuration: "8 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 150,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 15, power: 6 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VIII Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 16, power: 16, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 160, launchers: "1 ad, 1 fv", spread: 5,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 4,
      },
    ],
    shields: { protection: 48, reinforced: 70, power: 48 },
  },

  // ─── DENEVA ──────────────────────────────────────────────────────────────────
  "deneva": {
    className: "Deneva",
    fullType: "Deneva-class Light Transport",
    commissioningDate: 2318,
    hull: { size: 4, lengthMeters: 210, decks: 11, resistance: 2, structuralPoints: 80 },
    operations: {
      crew: 90, passengers: 1100, evacuation: 2000, crewPower: 6,
      computers: 3, computersPower: 3,
      transporters: { personnel: 3, cargo: 8, emergency: 3, power: 7 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.0, maximum: 9.2, maxDuration: "6 hours", powerPerFactor: 2 },
      impulse: { cruising: ".5c", maximum: ".75c", powerCruising: 5, powerMaximum: 7 },
      totalPower: 110,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 12, power: 6 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VI Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 12, power: 12, weaponsSkill: 3,
      },
    ],
    shields: { protection: 30, reinforced: 48, power: 30 },
  },

  // ─── MERCED ──────────────────────────────────────────────────────────────────
  "merced": {
    className: "Merced",
    fullType: "Merced-class Light Escort (Corvette)",
    commissioningDate: 2312,
    hull: { size: 4, lengthMeters: 187, decks: 9, resistance: 3, structuralPoints: 80 },
    operations: {
      crew: 50, passengers: 150, evacuation: 400, crewPower: 5,
      computers: 3, computersPower: 3,
      transporters: { personnel: 2, cargo: 2, emergency: 2, power: 3 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.0, maximum: 9.2, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".7c", maximum: ".9c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 125,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 6 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VII Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 14, power: 14, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 75, launchers: "1 ad, 1 fv", spread: 4,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 4,
      },
    ],
    shields: { protection: 48, reinforced: 70, power: 48 },
  },

  // ─── MIRANDA ─────────────────────────────────────────────────────────────────
  "miranda": {
    className: "Miranda",
    fullType: "Miranda-class Cruiser",
    commissioningDate: 2274,
    hull: { size: 5, lengthMeters: 278, decks: 15, resistance: 3, structuralPoints: 100 },
    operations: {
      crew: 220, passengers: 250, evacuation: 500, crewPower: 5,
      computers: 5, computersPower: 5,
      transporters: { personnel: 4, cargo: 3, emergency: 3, power: 5 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 8.8, maximum: 9.2, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".6c", maximum: ".8c", powerCruising: 6, powerMaximum: 8 },
      totalPower: 130,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 6 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VII Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 14, power: 14, weaponsSkill: 4,
      },
      {
        name: "Type SX-3 Pulse Phaser Cannon", type: "cannon",
        range: [10, 35000, 110000, 325000], arc: "Forward or aft",
        accuracy: [5, 6, 8, 11], damage: 15, power: 15, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 150, launchers: "1 ad, 1 fv", spread: 5,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 4,
      },
    ],
    shields: { protection: 48, reinforced: 70, power: 48 },
  },

  // ─── NEW ORLEANS ─────────────────────────────────────────────────────────────
  "new-orleans": {
    className: "New Orleans",
    fullType: "New Orleans-class Frigate",
    commissioningDate: 2332,
    hull: { size: 7, lengthMeters: 425, decks: 18, resistance: 4, structuralPoints: 140 },
    operations: {
      crew: 550, passengers: 1600, evacuation: 4200, crewPower: 6,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fd, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.0, maximum: 9.3, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".9c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 170,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 15, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type IX Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 18, power: 18, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 200, launchers: "1 ad, 1 fv", spread: 8,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 55, reinforced: 75, power: 55 },
  },

  // ─── NIAGARA ─────────────────────────────────────────────────────────────────
  "niagara": {
    className: "Niagara",
    fullType: "Niagara-class Fast Cruiser",
    commissioningDate: 2349,
    hull: { size: 5, lengthMeters: 330, decks: 16, resistance: 4, structuralPoints: 100 },
    operations: {
      crew: 400, passengers: 1650, evacuation: 3500, crewPower: 6,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 2, emergency: 4, power: 5 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.0, maximum: 9.6, maxDuration: "16 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 160,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type IX Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 18, power: 18, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 160, launchers: "1 ad, 1 fv", spread: 8,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 4,
      },
    ],
    shields: { protection: 50, reinforced: 70, power: 50 },
  },

  // ─── NORWAY ──────────────────────────────────────────────────────────────────
  "norway": {
    className: "Norway",
    fullType: "Norway-class Cruiser",
    commissioningDate: 2369,
    hull: { size: 6, lengthMeters: 365, decks: 14, resistance: 4, structuralPoints: 120 },
    operations: {
      crew: 190, passengers: 200, evacuation: 500, crewPower: 5,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fd, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.2, maximum: 9.7, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 175,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type X Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 225, launchers: "1 ad, 1 fv", spread: 10,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 60, reinforced: 80, power: 60 },
  },

  // ─── OLYMPIC ─────────────────────────────────────────────────────────────────
  "olympic": {
    className: "Olympic",
    fullType: "Olympic-class Medical Cruiser",
    commissioningDate: 2361,
    hull: { size: 5, lengthMeters: 310, decks: 27, resistance: 3, structuralPoints: 100 },
    operations: {
      crew: 750, passengers: 2600, evacuation: 8000, crewPower: 7,
      computers: 5, computersPower: 5,
      transporters: { personnel: 6, cargo: 2, emergency: 6, power: 7 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.0, maximum: 9.2, maxDuration: "6 hours", powerPerFactor: 2 },
      impulse: { cruising: ".7c", maximum: ".9c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 140,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 6 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type VI Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 12, power: 12, weaponsSkill: 3,
      },
    ],
    shields: { protection: 48, reinforced: 70, power: 48 },
  },

  // ─── RIGEL ───────────────────────────────────────────────────────────────────
  "rigel": {
    className: "Rigel",
    fullType: "Rigel-class Heavy Scout",
    commissioningDate: 2327,
    hull: { size: 4, lengthMeters: 215, decks: 6, resistance: 3, structuralPoints: 80 },
    operations: {
      crew: 70, passengers: 125, evacuation: 400, crewPower: 4,
      computers: 3, computersPower: 3,
      transporters: { personnel: 2, cargo: 2, emergency: 2, power: 3 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.0, maximum: 9.2, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".7c", maximum: ".9c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 125,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VII Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 14, power: 14, weaponsSkill: 4,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 75, launchers: "1 ad, 1 fv", spread: 4,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 4,
      },
    ],
    shields: { protection: 48, reinforced: 70, power: 48 },
  },

  // ─── SABER ───────────────────────────────────────────────────────────────────
  "saber": {
    className: "Saber",
    fullType: "Saber-class Light Cruiser (Perimeter Defense Vessel)",
    commissioningDate: 2370,
    hull: { size: 4, lengthMeters: 160, decks: 6, resistance: 4, structuralPoints: 80 },
    operations: {
      crew: 40, passengers: 80, evacuation: 200, crewPower: 4,
      computers: 3, computersPower: 3,
      transporters: { personnel: 2, cargo: 2, emergency: 2, power: 3 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.2, maximum: 9.7, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".92c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 130,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 6 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type X Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 100, launchers: "1 ad, 1 fv", spread: 4,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 60, reinforced: 80, power: 60 },
  },

  // ─── STEAMRUNNER ─────────────────────────────────────────────────────────────
  "steamrunner": {
    className: "Steamrunner",
    fullType: "Steamrunner-class Heavy Frigate",
    commissioningDate: 2369,
    hull: { size: 6, lengthMeters: 375, decks: 18, resistance: 5, structuralPoints: 120 },
    operations: {
      crew: 200, passengers: 250, evacuation: 750, crewPower: 5,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fd, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.2, maximum: 9.7, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 180,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type X Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 250, launchers: "1 ad, 1 fv", spread: 10,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 60, reinforced: 80, power: 60 },
  },

  // ─── SOVEREIGN ───────────────────────────────────────────────────────────────
  "sovereign": {
    className: "Sovereign",
    fullType: "Sovereign-class Heavy Explorer",
    commissioningDate: 2370,
    hull: { size: 9, lengthMeters: 732, decks: 24, resistance: 5, structuralPoints: 180 },
    operations: {
      crew: 1000, passengers: 5000, evacuation: 11000, crewPower: 7,
      computers: 7, computersPower: 7,
      transporters: { personnel: 6, cargo: 8, emergency: 6, power: 10 },
      tractorBeams: "1 av, 1 fd, 1 fv",
    },
    propulsion: {
      warp: { cruising: 7.0, standard: 9.6, maximum: 9.9, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".95c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 210,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 2, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type X Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 150, launchers: "1 ad, 1 fv, 1 aft in saucer", spread: 10,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
      {
        name: "Mark II Quantum Torpedoes", type: "torpedo",
        number: 100, launchers: "1 ad, 1 fv, 1 aft in saucer", spread: 10,
        range: [20, 350000, 1250000, 4000000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 25, power: 6, weaponsSkill: 5,
      },
    ],
    shields: { protection: 65, reinforced: 85, power: 65 },
  },

  // ─── AMBASSADOR ──────────────────────────────────────────────────────────────
  // Source: TNG Core Game Book (LUG25000)
  "ambassador": {
    className: "Ambassador",
    fullType: "Ambassador-class Heavy Cruiser",
    commissioningDate: 2335,
    hull: { size: 8, lengthMeters: 525, decks: 40, resistance: 4, structuralPoints: 160 },
    operations: {
      crew: 900, passengers: 4100, evacuation: 15000, crewPower: 7,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.0, maximum: 9.2, maxDuration: "6 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".9c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 175,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 5 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type IX Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 18, power: 18, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 250, launchers: "1 ad, 1 fv", spread: 8,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 55, reinforced: 75, power: 55 },
  },

  // ─── DEFIANT ─────────────────────────────────────────────────────────────────
  // Source: DS9 Core Game Book (LUG35000)
  "defiant": {
    className: "Defiant",
    fullType: "Defiant-class Warship",
    commissioningDate: 2370,
    hull: { size: 4, lengthMeters: 170, decks: 4, resistance: 4, structuralPoints: 80 },
    operations: {
      crew: 40, passengers: 10, evacuation: 150, crewPower: 5,
      computers: 2, computersPower: 2,
      transporters: { personnel: 1, cargo: 0, emergency: 1, power: 1 },
      tractorBeams: "1 av, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.2, maximum: 9.982, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".92c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 180,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 15, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Pulse Phaser Cannon", type: "cannon",
        range: [10, 35000, 110000, 325000], arc: "360° forward",
        accuracy: [3, 4, 6, 9], damage: 25, power: 25, weaponsSkill: 5,
      },
      {
        name: "Type VIII Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "360° dorsal",
        accuracy: [3, 4, 6, 9], damage: 16, power: 16, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 50, launchers: "2 ad, 1 fwd, 2 fd", spread: 6,
        range: [15, 350000, 1500000, 4050000], arc: "Forward or aft, self-guided",
        accuracy: [3, 4, 6, 9], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 50, reinforced: 75, power: 50 },
  },

  // ─── EXCELSIOR ───────────────────────────────────────────────────────────────
  // Source: TNG Core Game Book (LUG25000) / DS9 Core Game Book (LUG35000)
  "excelsior": {
    className: "Excelsior",
    fullType: "Excelsior-class Heavy Cruiser",
    commissioningDate: 2285,
    hull: { size: 7, lengthMeters: 470, decks: 30, resistance: 3, structuralPoints: 140 },
    operations: {
      crew: 770, passengers: 3500, evacuation: 9800, crewPower: 7,
      computers: 4, computersPower: 4,
      transporters: { personnel: 4, cargo: 5, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.0, maximum: 9.2, maxDuration: "6 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".9c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 160,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 5 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type IX Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 18, power: 18, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 200, launchers: "1 ad, 1 fv", spread: 5,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 48, reinforced: 70, power: 48 },
  },

  // ─── GALAXY ──────────────────────────────────────────────────────────────────
  // Source: TNG Core Game Book (LUG25000)
  "galaxy": {
    className: "Galaxy",
    fullType: "Galaxy-class Explorer",
    commissioningDate: 2357,
    hull: { size: 8, lengthMeters: 641, decks: 42, resistance: 4, structuralPoints: 160 },
    operations: {
      crew: 1100, passengers: 5000, evacuation: 15000, crewPower: 7,
      computers: 6, computersPower: 6,
      transporters: { personnel: 6, cargo: 8, emergency: 6, power: 10 },
      tractorBeams: "1 av, 1 fd, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.2, maximum: 9.6, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".92c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 200,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type X Phaser Array", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 250, launchers: "1 ad, 1 fv, 1 aft-saucer", spread: 10,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 60, reinforced: 80, power: 60 },
  },

  // ─── NEBULA ──────────────────────────────────────────────────────────────────
  // Source: TNG Core Game Book (LUG25000)
  "nebula": {
    className: "Nebula",
    fullType: "Nebula-class Modular Explorer",
    commissioningDate: 2361,
    hull: { size: 7, lengthMeters: 350, decks: 21, resistance: 3, structuralPoints: 140 },
    operations: {
      crew: 550, passengers: 2000, evacuation: 9800, crewPower: 7,
      computers: 6, computersPower: 6,
      transporters: { personnel: 4, cargo: 4, emergency: 4, power: 6 },
      tractorBeams: "1 ad, 1 fd, 1 fv",
    },
    propulsion: {
      warp: { cruising: 6.0, standard: 9.2, maximum: 9.6, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".75c", maximum: ".92c", powerCruising: 7, powerMaximum: 9 },
      totalPower: 190,
    },
    sensors: {
      longRange: { bonus: 2, rangeLY: 17, power: 6 },
      lateral: { bonus: 2, rangeLY: 1, power: 4 },
      navigational: { bonus: 2, power: 5 },
      skill: 5,
    },
    weapons: [
      {
        name: "Type X Phaser Array", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 20, power: 20, weaponsSkill: 5,
      },
      {
        name: "Type II Photon Torpedoes", type: "torpedo",
        number: 250, launchers: "1 ad, 1 fv", spread: 8,
        range: [15, 300000, 1000000, 3500000], arc: "Forward or aft, self-guided",
        accuracy: [4, 5, 7, 10], damage: 20, power: 5, weaponsSkill: 5,
      },
    ],
    shields: { protection: 60, reinforced: 80, power: 60 },
  },

  // ─── OBERTH ──────────────────────────────────────────────────────────────────
  // Source: TNG Core Game Book (LUG25000)
  "oberth": {
    className: "Oberth",
    fullType: "Oberth-class Science Vessel",
    commissioningDate: 2269,
    hull: { size: 3, lengthMeters: 160, decks: 11, resistance: 3, structuralPoints: 60 },
    operations: {
      crew: 80, passengers: 625, evacuation: 2000, crewPower: 6,
      computers: 4, computersPower: 4,
      transporters: { personnel: 2, cargo: 2, emergency: 0, power: 2 },
      tractorBeams: "1 av, 1 fv",
    },
    propulsion: {
      warp: { cruising: 5.0, standard: 9.2, maximum: 9.6, maxDuration: "6 hours", powerPerFactor: 2 },
      impulse: { cruising: ".5c", maximum: ".75c", powerCruising: 5, powerMaximum: 7 },
      totalPower: 115,
    },
    sensors: {
      longRange: { bonus: 1, rangeLY: 15, power: 5 },
      lateral: { bonus: 1, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 4,
    },
    weapons: [
      {
        name: "Type VI Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [5, 6, 8, 11], damage: 12, power: 12, weaponsSkill: 4,
      },
    ],
    shields: { protection: 36, reinforced: 50, power: 36 },
  },

  // ─── CAPTAIN'S YACHT ─────────────────────────────────────────────────────────
  "captains-yacht": {
    className: "Captain's Yacht",
    fullType: "Captain's Yacht, Type IX",
    commissioningDate: 2370,
    hull: { size: 2, lengthMeters: 18, decks: 1, resistance: 2, structuralPoints: 40 },
    operations: {
      crew: 3, passengers: 12, evacuation: 12, crewPower: 3,
      computers: 1, computersPower: 1,
      transporters: { personnel: 1, cargo: 0, emergency: 0, power: 1 },
      tractorBeams: "1 aft",
    },
    propulsion: {
      warp: { cruising: 1.2, standard: 2.0, maximum: 3.0, maxDuration: "12 hours", powerPerFactor: 2 },
      impulse: { cruising: ".65c", maximum: ".85c", powerCruising: 6, powerMaximum: 8 },
      totalPower: 95,
    },
    sensors: {
      longRange: { bonus: 0, rangeLY: 5, power: 6 },
      lateral: { bonus: 0, rangeLY: 1, power: 4 },
      navigational: { bonus: 1, power: 5 },
      skill: 3,
    },
    weapons: [
      {
        name: "Type V Phaser", type: "phaser",
        range: [10, 30000, 100000, 300000], arc: "All (720 degrees)",
        accuracy: [4, 5, 7, 10], damage: 10, power: 10, weaponsSkill: 3,
      },
    ],
    shields: { protection: 30, reinforced: 40, power: 30 },
  },

};

/** Sorted list of class names for dropdowns. */
export const LUG_CLASS_NAMES = Object.keys(LUG_SHIP_CLASSES).sort();
