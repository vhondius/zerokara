import type { Book } from "../schema";
import { loadBook } from "../loader";
import raw from "./jfz-4.json";

export const jfz4: Book = loadBook(raw);
