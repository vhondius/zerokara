import type { Book } from "../schema";
import { loadBook } from "../loader";
import raw from "./jfz-3.json";

export const jfz3: Book = loadBook(raw);
