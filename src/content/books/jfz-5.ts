import type { Book } from "../schema";
import { loadBook } from "../loader";
import raw from "./jfz-5.json";

export const jfz5: Book = loadBook(raw);
