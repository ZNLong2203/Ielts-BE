// Helpers to define a generic pagination options interface based on Prisma models
export type ModelPrismaWithFunctions = {
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
};

// Helper type để extract Prisma findMany args
type ExtractPrismaDelegate<T> = T extends {
  findMany: (args?: infer A) => any;
  count: (args?: any) => any;
}
  ? {
      findManyArgs: A;
      delegate: T;
    }
  : never;

// Generic interface dựa trên Prisma delegate
export interface PaginationOptions<T> {
  model: T;
  query: {
    page?: number;
    limit?: number;
    sort?: string;
    search?: string;
    all?: boolean;
  };
  where?: ExtractPrismaDelegate<T>['findManyArgs'] extends { where?: infer W }
    ? W
    : never;
  include?: ExtractPrismaDelegate<T>['findManyArgs'] extends {
    include?: infer I;
  }
    ? I
    : never;
  select?: ExtractPrismaDelegate<T>['findManyArgs'] extends { select?: infer S }
    ? S
    : never;
  orderBy?: ExtractPrismaDelegate<T>['findManyArgs'] extends {
    orderBy?: infer O;
  }
    ? O
    : never;
  defaultOrderBy?: ExtractPrismaDelegate<T>['findManyArgs'] extends {
    orderBy?: infer O;
  }
    ? O
    : never;
}
