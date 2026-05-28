import * as cheerio from 'cheerio';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/1fuli',
    categories: ['multimedia'],
    example: '/jubt/1fuli',
    url: 'jubt13.xyz/cn/1fuli.html',
    name: '1福利 - 每日福利分享',
    maintainers: ['panqingjie00'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: true,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['jubt13.xyz'],
            target: '/1fuli',
        },
    ],
    handler,
};

async function handler() {
    const baseUrl = 'https://jubt13.xyz';
    const listUrl = `${baseUrl}/cn/1fuli.html`;

    const response = await ofetch(listUrl);
    const $ = cheerio.load(response);

    const items = $('ul li h4 a')
        .toArray()
        .map((el) => {
            const $el = $(el);
            const title = $el.text().trim();
            const link = $el.attr('href') ?? '';
            const dateMatch = title.match(/(\d{4}-\d{2}-\d{2})$/);
            const pubDate = dateMatch ? parseDate(dateMatch[1]) : undefined;

            return {
                title,
                description: `<p><a href="${link}">查看详情</a></p>`,
                link,
                pubDate,
            };
        })
        .slice(0, 30);

    return {
        title: '1福利 - 每日福利分享',
        link: listUrl,
        description: '1福利每日更新 - BT/磁力资源分享',
        language: 'zh-CN',
        image: `${baseUrl}/assets/images/logo@2x.png`,
        item: items,
    };
}
