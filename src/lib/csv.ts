export interface CSVStudentRow {
  name: string;
  electionNumber: string;
  class: string;
  section: string;
}

export interface CSVParseResult {
  success: boolean;
  data: CSVStudentRow[];
  errors: string[];
  totalRows: number;
}

/**
 * Parse a CSV file containing student data.
 * Expected columns (in order): Name of Student, Election Number, Class, Section
 */
export function parseStudentCSV(csvContent: string): CSVParseResult {
  const errors: string[] = [];
  const data: CSVStudentRow[] = [];

  const result = Papa.parse(csvContent, {
    header: false,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(`Row ${err.row}: ${err.message}`);
    }
  }

  const rows = result.data as string[][];

  // Skip header row if it looks like a header
  let startIdx = 0;
  if (rows.length > 0) {
    const firstRow = rows[0];
    const isHeader =
      firstRow[0]?.toLowerCase() === "name" ||
      firstRow[1]?.toLowerCase() === "number" ||
      firstRow[2]?.toLowerCase() === "class" ||
      firstRow[3]?.toLowerCase() === "section";
    if (isHeader) {
      startIdx = 1;
    }
  }

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row || row.length < 4) {
      errors.push(
        `Row ${rowNum}: Expected 4 columns (name, number, class, section), got ${row?.length || 0}`
      );
      continue;
    }

    const name = row[0]?.trim();
    const electionNumber = row[1]?.trim();
    const studentClass = row[2]?.trim();
    const section = row[3]?.trim();

    // Validate name
    if (!name) {
      errors.push(`Row ${rowNum}: Name is required`);
      continue;
    }

    // Validate election number (6 char alphanumeric)
    if (!electionNumber || !/^[0-9A-Za-z]{6}$/.test(electionNumber)) {
      errors.push(
        `Row ${rowNum}: Election Number must be exactly 6 alphanumeric characters`
      );
      continue;
    }

    // Validate class (6 to 12)
    if (!studentClass || !/^(6|7|8|9|10|11|12)$/.test(studentClass)) {
      errors.push(`Row ${rowNum}: Class must be a number between 6 and 12`);
      continue;
    }

    // Validate section (A to K)
    const upperSection = section?.toUpperCase();
    if (!upperSection || !/^[A-K]$/.test(upperSection)) {
      errors.push(`Row ${rowNum}: Section must be a single letter from A to K`);
      continue;
    }

    data.push({
      name,
      electionNumber,
      class: studentClass,
      section: upperSection,
    });
  }

  // Check for duplicate election numbers
  const enSet = new Set<string>();
  for (const student of data) {
    if (enSet.has(student.electionNumber)) {
      errors.push(
        `Duplicate Election Number: ${student.electionNumber}`
      );
    }
    enSet.add(student.electionNumber);
  }

  return {
    success: errors.length === 0,
    data,
    errors,
    totalRows: rows.length - startIdx,
  };
}
