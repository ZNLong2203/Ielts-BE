// src/common/services/pagination.service.ts
import { Injectable } from '@nestjs/common';
import { PaginationOptions } from 'src/interface/pagination-options.interface';

@Injectable()
export class UtilsService {
  async paginate<TWhere = any, TInclude = any, TSelect = any, TOrderBy = any>(
    options: PaginationOptions<TWhere, TInclude, TSelect, TOrderBy>,
  ) {
    const { model, query, where, include, select, defaultOrderBy } = options;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [field, order] = query.sort?.split(':') ?? [];

    const orderBy = field
      ? ({ [field]: order === 'desc' ? 'desc' : 'asc' } as TOrderBy)
      : defaultOrderBy;

    const [items, totalItems] = await Promise.all([
      model.findMany({
        where,
        include,
        select,
        skip,
        take: limit,
        orderBy,
      }),
      model.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      meta: {
        current: page,
        currentSize: items.length,
        pageSize: limit,
        total: totalItems,
        pages: totalPages,
      },
      result: items,
    };
  }
}
