import type { Route } from '@/types';
import cache from '@/utils/cache';
import { parseDate } from '@/utils/parse-date';
import { getPlaywrightPage } from '@/utils/playwright';

export const route: Route = {
    path: '/latest',
    categories: ['new-media'],
    example: '/jiqizhixin/latest',
    url: 'www.jiqizhixin.com',
    name: '最新文章',
    maintainers: ['panqingjie00'],
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['jiqizhixin.com'],
            target: '/latest',
        },
    ],
    handler,
};

async function handler() {
    const baseUrl = 'https://www.jiqizhixin.com';

    const articles = await cache.tryGet('jiqizhixin:latest', async () => {
        const { page, destroy } = await getPlaywrightPage(baseUrl, {
            gotoConfig: { waitUntil: 'domcontentloaded' },
            closeTimeout: 90000,
        });

        // Wait longer for React to render, up to 30s
        try {
            await page.waitForSelector('.home__article-item', { timeout: 30000 });
        } catch {
            // Check if anti-bot page appeared
            const title = await page.title();
            if (title.includes('数据服务')) {
                await destroy();
                throw new Error('Anti-bot page detected, jiqizhixin blocked HF server IP');
            }
            // Try waiting more
            await page.waitForTimeout(10000);
        }

        const list = await page.evaluate(() => {
            const items = document.querySelectorAll('.home__article-item');
            if (items.length === 0) {
                // Fallback: try article cards on /articles page style
                const cards = document.querySelectorAll('.article-card');
                return [...cards].map((card) => {
                    const titleEl = card.querySelector('.article-card__title');
                    const timeEl = card.querySelector('.article-card__time');
                    const tagEls = card.querySelectorAll('.article-card__tags div');
                    const imgEl = card.querySelector('img');
                    const uuid = imgEl?.src?.match(/cover_image\/([a-f0-9-]+)\//)?.[1] ?? '';
                    return {
                        title: titleEl?.textContent?.trim() ?? '',
                        time: timeEl?.textContent?.trim() ?? '',
                        tags: [...tagEls].map((t) => t.textContent?.trim() ?? ''),
                        img: imgEl?.src ?? '',
                        uuid,
                    };
                }).filter((a) => a.uuid);
            }

            return [...items].map((item) => {
                const titleEl = item.querySelector('.home__article-item__title');
                const timeEl = item.querySelector('.home__article-item__time');
                const tagEls = item.querySelectorAll('.home__article-item__tag-item');
                const imgEl = item.querySelector('img');
                const uuid = imgEl?.src?.match(/cover_image\/([a-f0-9-]+)\//)?.[1] ?? '';
                return {
                    title: titleEl?.textContent?.trim() ?? '',
                    time: timeEl?.textContent?.trim() ?? '',
                    tags: [...tagEls].map((t) => t.textContent?.trim() ?? ''),
                    img: imgEl?.src ?? '',
                    uuid,
                };
            }).filter((a) => a.uuid);
        });

        await destroy();
        return list;
    });

    const items = articles.map((article) => ({
        title: article.title,
        description: article.img ? `<img src="${article.img}" alt="${article.title}">` : article.title,
        pubDate: parseDate(article.time),
        link: `${baseUrl}/articles/${article.uuid}`,
        category: article.tags,
        author: '机器之心',
    }));

    return {
        title: '机器之心 - 最新文章',
        link: baseUrl,
        description: '机器之心最新 AI 新闻资讯',
        language: 'zh-CN',
        image: 'https://cdn.jiqizhixin.com/assets/logo-black-7fa9710b66.png',
        item: items,
    };
}
