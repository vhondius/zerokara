import type { Book } from "../schema";
import { loadBook } from "../loader";
import raw from "./jfz-1.json";

export const jfz1: Book = loadBook(raw);
