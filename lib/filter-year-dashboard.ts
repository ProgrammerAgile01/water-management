type YearFilter<T extends string> = {
  [K in T]?: number;
};

export function whereYear<T extends string>(
  year: number | null,
  field: T,
): YearFilter<T> {
  return year ? ({ [field]: year } as YearFilter<T>) : {};
}

export function wherePeriodeYear(year: number | null) {
  return year ? { periode: { tahun: year } } : {};
}