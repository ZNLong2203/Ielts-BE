// src/common/services/pagination.service.ts
import { Injectable } from '@nestjs/common';
import { PaginationOptions } from 'src/interface/pagination-options.interface';

type Primitive = string | number | boolean | Date;
@Injectable()
export class UtilsService {
  private VALID_OPERATORS = [
    'equals',
    'in',
    'notIn',
    'lt',
    'lte',
    'gt',
    'gte',
    'contains',
    'startsWith',
    'endsWith',
    'mode',
    'not',
  ];

  /**
   * Paginates the results based on the provided options.
   * @param options - The pagination options including model, query, where, include, select, and defaultOrderBy.
   * @returns A promise that resolves to the paginated result.
   */
  async paginate<TWhere = any, TInclude = any, TSelect = any, TOrderBy = any>(
    options: PaginationOptions<TWhere, TInclude, TSelect, TOrderBy>,
  ) {
    const { model, query, where, include, select, defaultOrderBy } = options;

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const all = Boolean(query.all ?? false);

    const [field, order] = query.sort?.split(':') ?? [];

    const orderBy = field
      ? ({ [field]: order === 'desc' ? 'desc' : 'asc' } as TOrderBy)
      : defaultOrderBy;

    // Prepare query options
    const queryOptions = {
      where,
      include,
      select,
      orderBy,
      ...(all ? {} : { skip: (page - 1) * limit, take: limit }),
    };

    const [items, totalItems] = await Promise.all([
      model.findMany(queryOptions),
      model.count({ where }),
    ]);

    // Calculate meta values
    const effectivePageSize = all ? items.length : limit;
    const totalPages = Math.ceil(totalItems / effectivePageSize);

    return {
      meta: {
        current: all ? 1 : page,
        currentSize: items.length,
        pageSize: effectivePageSize,
        total: totalItems,
        pages: totalPages,
      },
      result: items,
    };
  }

  /**
   * Handles the value parsing for different types.
   * @param val - The value to be parsed.
   * @returns The parsed value as a primitive type or an array of primitives.
   */
  private handleValue(val: string): Primitive | Primitive[] {
    if (val.includes(',')) {
      return val
        .split(',')
        .map((v) => this.handleValue(v.trim())) as Primitive[];
    }

    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(Number(val))) return Number(val);

    const date = new Date(val);
    if (!isNaN(date.getTime())) return date;

    return val;
  }

  /**
   * Parses a nested object structure and handles its values.
   * @param obj - The object to be parsed.
   * @returns A new object with parsed values.
   */
  private parseNestedObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const key in obj) {
      const value = obj[key];

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this.parseNestedObject(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        result[key] = this.handleValue(value);
      }
    }

    return result;
  }

  /**
   * Assigns a value to a deeply nested property in an object.
   * @param target - The target object to assign the value to.
   * @param path - The array of keys representing the property path.
   * @param value - The value to assign.
   */
  private assignDeep(
    target: Record<string, unknown>,
    path: string[],
    value: unknown,
  ): void {
    const key = path[0];
    if (path.length === 1) {
      target[key] = value;
    } else {
      if (typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {};
      }
      this.assignDeep(
        target[key] as Record<string, unknown>,
        path.slice(1),
        value,
      );
    }
  }

  /**
   * Builds a "where" clause from the query parameters.
   * @param query - The query parameters to build the "where" clause from.
   * @returns The constructed "where" clause.
   *
   * Valid operators include:
   * - equals
   * - in
   * - notIn
   * - lt (less than)
   * - lte (less than or equal to)
   * - gt (greater than)
   * - gte (greater than or equal to)
   * - contains
   * - startsWith
   * - endsWith
   * - mode (used for case-insensitive matching strings)
   * - not
   *
   * List api query parameters that can be used:
   * 1. Primitive Filters:
   * - ?name=John: matches name exactly "John"
   * - ?age[gte]=18: matches age greater than or equal to 18
   * - ?age[lt]=30: matches age less than 30
   * - ?status[in]=active,inactive: matches status in ["active", "inactive"]
   *
   * 2. String Filters:
   * - ?email[contains]=example: matches email containing "example"
   * - ?username[startsWith]=user: matches username starting with "user"
   * - ?phone[endsWith]=123: matches phone ending with "123"
   * - ?name[mode]=insensitive: matches name case-insensitively
   *
   * 3. Date Filters:
   * - ?createdAt[gte]=2023-01-01: matches createdAt greater than or equal to January 1, 2023
   * - ?createdAt[lt]=2023-12-31: matches createdAt less than December 31, 2023
   *
   * 4. Nested Relation Filters:
   * - ?profile.age[gte]=18: matches profile's age greater than or equal to 18
   * - ?profile.address.city[contains]=New York: matches profile's address city containing "New York"
   *
   * 5. Logical Operators (AND, OR, NOT):
   * - ?AND[0][age][gte]=18: matches the first condition age greater than or equal to 18
   * - ?OR[0][status]=active: matches the first condition status equals "active"
   * - ?NOT[0][email][contains]=spam: matches the first condition email not containing "spam"
   * - ?OR[1][phone][startsWith]=123: matches the second condition phone starting with "123"
   */
  buildWhereFromQuery(query: Record<string, unknown>): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    const { page, limit, sort, search, all, ...filters } = query;

    for (const key in filters) {
      const value = filters[key];

      // Handle logical operators: AND, OR, NOT
      if (
        ['AND', 'OR', 'NOT'].includes(key) &&
        typeof value === 'object' &&
        value !== null
      ) {
        const conditionList = Object.values(value).map((item) =>
          typeof item === 'object' && item !== null
            ? this.parseNestedObject(item as Record<string, unknown>)
            : {},
        );
        where[key] = conditionList;
        continue;
      }

      const segments = key.split('.');
      const lastSegment = segments[segments.length - 1];

      // Check for field[operator] syntax
      const match = lastSegment.match(/^(\w+)\[([a-zA-Z]+)\]$/);
      if (match) {
        const [, field, operator] = match;
        if (!this.VALID_OPERATORS.includes(operator)) {
          throw new Error(`Invalid operator: ${operator}`);
        }
        segments[segments.length - 1] = field;
        const parsed = this.handleValue(value as string);

        // Traverse or initialize the nested structure
        let current = where;
        for (let i = 0; i < segments.length - 1; i++) {
          const seg = segments[i];
          if (
            typeof current[seg] !== 'object' ||
            current[seg] === null ||
            Array.isArray(current[seg])
          ) {
            current[seg] = {};
          }
          current = current[seg] as Record<string, unknown>;
        }

        const fieldName = segments[segments.length - 1];

        if (
          typeof current[fieldName] !== 'object' ||
          current[fieldName] === null ||
          Array.isArray(current[fieldName])
        ) {
          current[fieldName] = {};
        }

        (current[fieldName] as Record<string, any>)[operator] = parsed;
      }
      // Handle object value like: age: { gte: 10 }
      else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        this.assignDeep(
          where,
          segments,
          this.parseNestedObject(value as Record<string, unknown>),
        );
      }
      // Handle simple key=value or nested field=value
      else {
        const parsed = this.handleValue(value as string);
        this.assignDeep(where, segments, parsed);
      }
    }

    return where;
  }

  cleanDto<T extends object>(dto: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined && v !== null),
    ) as Partial<T>;
  }
}
