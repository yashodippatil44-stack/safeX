const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'visionx_db.json');

// Initial default empty database schema
const defaultSchema = {
  users: [],
  touristProfiles: [],
  locations: [],
  geoFences: [],
  incidents: [],
  emergencies: [],
  travelGroups: [],
  travelGroupMembers: [],
  certificates: [],
  efirs: [],
  auditLogs: [],
  notifications: [],
  safetyStatuses: [],
  emergencyServices: []
};

class JsonDB {
  constructor() {
    this.data = { ...defaultSchema };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = { ...defaultSchema, ...JSON.parse(raw) };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[DB] Failed to load database file, initializing in-memory fallback:', err.message);
      this.data = { ...defaultSchema };
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error writing to db file:', err.message);
    }
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return {
      find: (filterFn) => {
        if (!filterFn) return [...this.data[name]];
        return this.data[name].filter(filterFn);
      },
      findOne: (filterFn) => {
        return this.data[name].find(filterFn) || null;
      },
      findById: (id) => {
        return this.data[name].find(item => item.id === id) || null;
      },
      insert: (doc) => {
        const newDoc = {
          ...doc,
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: doc.updatedAt || new Date().toISOString()
        };
        this.data[name].push(newDoc);
        this.save();
        return newDoc;
      },
      updateById: (id, updates) => {
        const index = this.data[name].findIndex(item => item.id === id);
        if (index === -1) return null;
        this.data[name][index] = {
          ...this.data[name][index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        this.save();
        return this.data[name][index];
      },
      deleteById: (id) => {
        const index = this.data[name].findIndex(item => item.id === id);
        if (index === -1) return false;
        this.data[name].splice(index, 1);
        this.save();
        return true;
      },
      count: (filterFn) => {
        if (!filterFn) return this.data[name].length;
        return this.data[name].filter(filterFn).length;
      }
    };
  }
}

const db = new JsonDB();

module.exports = db;
