export interface PaginationOptions<
  TWhere = any,
  TInclude = any,
  TSelect = any,
  TOrderBy = any,
> {
  model: {
    findMany: (args: {
      where?: TWhere;
      include?: TInclude;
      select?: TSelect;
      skip?: number;
      take?: number;
      orderBy?: TOrderBy;
    }) => Promise<any[]>;
    count: (args: { where?: TWhere }) => Promise<number>;
  };
  query: {
    page?: number;
    limit?: number;
    sort?: string;
    search?: string;
  };
  where?: TWhere;
  include?: TInclude;
  select?: TSelect;
  defaultOrderBy?: TOrderBy;
}
