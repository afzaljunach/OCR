/**
 * Production configuration for SAP BTP deployment
 * This file handles database configuration when deployed to Cloud Foundry
 */
module.exports = {
  db: {
    kind: process.env.DB_KIND || "sqlite",
    model: ["db/schema", "srv/service"],
    credentials: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || "sqlite.db"
    }
  }
};