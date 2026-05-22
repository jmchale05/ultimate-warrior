import type { SchoolType } from "../types";

export const PRIMARY_YEAR_OPTIONS = ["Year 4", "Year 5", "Year 6"];
export const SECONDARY_YEAR_OPTIONS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];

export function getYearOptionsForSchoolType(schoolType: SchoolType | null | undefined): string[] {
  return schoolType === "Primary School" ? PRIMARY_YEAR_OPTIONS : SECONDARY_YEAR_OPTIONS;
}