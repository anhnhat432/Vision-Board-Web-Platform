import { TwelveWeekImportService } from "./orchestrator";
import { MongoTwelveWeekImportRepository } from "./repository";

export const twelveWeekImportService = new TwelveWeekImportService(new MongoTwelveWeekImportRepository());
