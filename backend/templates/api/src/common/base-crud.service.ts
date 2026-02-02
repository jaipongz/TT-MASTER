import { PrismaService } from '../prisma/prisma.service';

export class BaseCrudService<
  TModel,
  TCreateDto = any,
  TUpdateDto = any
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: any
  ) {}

  create(data: TCreateDto): Promise<TModel> {
    return this.model.create({ data });
  }

  findAll(): Promise<TModel[]> {
    return this.model.findMany();
  }

  findOne(id: number): Promise<TModel | null> {
    return this.model.findUnique({
      where: { id }
    });
  }

  update(id: number, data: TUpdateDto): Promise<TModel> {
    return this.model.update({
      where: { id },
      data
    });
  }

  remove(id: number): Promise<TModel> {
    return this.model.delete({
      where: { id }
    });
  }
}
