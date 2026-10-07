import type { Book } from "../schema";
import { loadBook } from "../loader";
import raw from "./jfz-2.json";

export const jfz2: Book = loadBook(raw);
