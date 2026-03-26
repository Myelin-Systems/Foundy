import type { IService } from "../framework/services/IServices.js";
import { config } from "dotenv";

// Load variables from .env into process.env
config();

export function env(key: string, service : IService): string {
  // process.env will now include variables from your .env file
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[${service.name}] Missing required environment variable: ${key}\n` +
      `Check your .env file or system environment variables.`
    );
  }
  
  return value;
}