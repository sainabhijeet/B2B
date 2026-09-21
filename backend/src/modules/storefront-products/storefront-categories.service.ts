import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Category } from '../../common/entities/category.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { AppConfigService } from '../app-config/app-config.service';
import { TranslationsService } from '../translations/translations.service';

const GROCERY_CATEGORY_IMAGE_SLUGS = new Set([
  'baby-care',
  'bakery',
  'beverages',
  'biscuits-snacks',
  'cleaning',
  'dairy',
  'dry-fruits',
  'frozen-foods',
  'grocery-staples',
  'home-care',
  'oil-ghee',
  'personal-care',
  'pulses-dal',
  'rice-flour',
  'spices',
  'stationery',
  'sugar-salt',
  'tea-coffee',
]);

@Injectable()
export class StorefrontCategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(TenantProfile) private readonly profileRepo: Repository<TenantProfile>,
    private readonly appConfig: AppConfigService,
    private readonly translations: TranslationsService,
  ) {}

  /** Public tenant catalog: tenant categories + master categories scoped to tenant profile industry. */
  async list(tenantId: string, channel?: 'app' | 'website') {
    const [profile, appConfig] = await Promise.all([
      this.profileRepo.findOne({
        where: { tenantId },
        select: ['industryId'],
      }),
      this.appConfig.getForTenant(tenantId),
    ]);
    const industryId = profile?.industryId ?? null;
    const qb = this.categoriesRepo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('c.status = :st', { st: 'active' })
      .andWhere(
        new Brackets((w) => {
          w.where('c.tenant_id = :tid', { tid: tenantId });
          if (industryId) {
            w.orWhere('(c.tenant_id IS NULL AND c.industry_id = :industryId)', { industryId });
          }
        }),
      )
      .orderBy('c.level', 'ASC')
      .addOrderBy('c.sort_order', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .take(300);

    if (channel === 'app') qb.andWhere('c.show_in_app = true');
    if (channel === 'website') qb.andWhere('c.show_in_website = true');

    const rows = await qb.getMany();
    const categoriesById = new Map(rows.map((category) => [category.id, category]));
    const items = await Promise.all(
      rows.map(async (c) => {
        const nameKey = this.translations.entityKey('category', c.slug, 'name');
        const descriptionKey = this.translations.entityKey(
          'category',
          c.slug,
          'description',
        );
        return {
          id: c.id,
          name: await this.translations.translateRuntimeText(
            tenantId,
            appConfig.selectedLanguageCode,
            c.name,
            [nameKey, this.translations.entityKey('category', c.id, 'name')],
          ),
          slug: c.slug,
          level: c.level,
          parentId: c.parentId,
          industryId: c.industryId,
          imageUrl: c.iconUrl || c.thumbnailUrl || this.categoryImageUrl(this.categoryImageSlug(c, categoriesById)),
          thumbnailUrl: c.thumbnailUrl || c.iconUrl || this.categoryImageUrl(this.categoryImageSlug(c, categoriesById)),
          bannerUrl: c.bannerUrl,
          description: await this.translations.translateRuntimeText(
            tenantId,
            appConfig.selectedLanguageCode,
            c.description,
            [descriptionKey, this.translations.entityKey('category', c.id, 'description')],
          ),
          translationKeys: {
            name: nameKey,
            description: descriptionKey,
          },
          sortOrder: c.sortOrder,
          showInApp: c.showInApp,
          showInWebsite: c.showInWebsite,
          showInMenu: c.showInMenu,
        };
      }),
    );
    return {
      success: true,
      data: {
        items,
      },
      message: '',
    };
  }

  private categoryImageUrl(slug: string): string {
    return `/storage/grocery-catalog/categories/${slug}.png`;
  }

  private categoryImageSlug(category: Category, categoriesById: Map<string, Category>): string {
    let root = category;
    const visited = new Set<string>();
    while (root.parentId && !visited.has(root.id)) {
      visited.add(root.id);
      const parent = categoriesById.get(root.parentId);
      if (!parent) break;
      root = parent;
    }
    if (GROCERY_CATEGORY_IMAGE_SLUGS.has(root.slug)) return root.slug;
    if (GROCERY_CATEGORY_IMAGE_SLUGS.has(category.slug)) return category.slug;

    const key = `${category.slug} ${category.name}`.toLowerCase();
    const mappings: Array<[RegExp, string]> = [
      [/baby/, 'baby-care'],
      [/bakery|bread/, 'bakery'],
      [/tea|coffee/, 'tea-coffee'],
      [/beverage|soft.?drink|juice|cola|energy.?drink/, 'beverages'],
      [/biscuit|cookie|snack|namkeen|savour/, 'biscuits-snacks'],
      [/laundry|detergent|clean/, 'cleaning'],
      [/dairy|milk|cheese|butter/, 'dairy'],
      [/dry.?fruit|cashew|almond|nut/, 'dry-fruits'],
      [/frozen/, 'frozen-foods'],
      [/dishwash|home.?care/, 'home-care'],
      [/oil|ghee/, 'oil-ghee'],
      [/personal|oral|tooth|soap|shampoo/, 'personal-care'],
      [/pulse|dal|lentil/, 'pulses-dal'],
      [/rice|flour|atta|grain|wheat/, 'rice-flour'],
      [/spice|masala/, 'spices'],
      [/stationery|paper|pen|notebook/, 'stationery'],
      [/sugar|salt/, 'sugar-salt'],
    ];
    return mappings.find(([pattern]) => pattern.test(key))?.[1] ?? 'grocery-staples';
  }
}
