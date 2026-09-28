import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

/**
 * robots：公开文档区全部放行；登录/个人/管理/问答区为私有界面，不向爬虫开放。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/my', '/ai', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
