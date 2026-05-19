import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/utils/prisma.service';
import type { Menu as MenuModel } from '@prisma/client';

export interface MenuDTO {
  id: string;
  name: string;
  path?: string;
  component?: string;
  redirect?: string;
  meta: {
    title: string;
    icon?: string;
    hidden?: boolean;
    affix?: boolean;
    noCache?: boolean;
    externalLink?: string;
    access?: string[];
    permission?: string[];
  };
  sort: number;
  children?: MenuDTO[];
}

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenus(): Promise<MenuDTO[]> {
    const allMenus = await this.prisma.menu.findMany({
      where: { status: 1, visible: true },
      orderBy: { sort: 'asc' },
    });

    const rootMenus = allMenus.filter((m) => !m.parentId);
    return rootMenus.map((menu) => this.buildMenuTree(menu, allMenus));
  }

  private buildMenuTree(parent: MenuModel, allMenus: MenuModel[]): MenuDTO {
    const children = allMenus.filter((m) => m.parentId === parent.id);

    return {
      id: String(parent.id),
      name: parent.routeName || parent.name,
      path: parent.path ?? undefined,
      component: parent.component ? `views/${parent.component}` : undefined,
      redirect: parent.redirect ?? undefined,
      meta: {
        title: parent.title || parent.name,
        icon: parent.icon ?? undefined,
        hidden: parent.hidden,
        affix: parent.affix,
        noCache: parent.noCache,
        externalLink: parent.externalLink ?? undefined,
        access: parent.permission ? JSON.parse(parent.permission) : undefined,
      },
      sort: parent.sort,
      children: children.length > 0
        ? children.map((child) => this.buildMenuTree(child, allMenus))
        : undefined,
    };
  }
}
