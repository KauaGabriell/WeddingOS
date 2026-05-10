export interface EntityRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<TEntity>;
}

export interface ListableRepository<TEntity, TFilter> {
  findMany(filter: TFilter): Promise<readonly TEntity[]>;
}

export interface CountableRepository<TFilter> {
  count(filter: TFilter): Promise<number>;
}

export interface DeletableRepository<TId = string> {
  delete(id: TId): Promise<void>;
}

export interface PaginationQuery {
  readonly page: number;
  readonly pageSize: number;
}
