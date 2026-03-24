export function isEmbeddableVideo(url) {
    return Boolean(url && /(youtube\.com|youtu\.be|bilibili\.com)/i.test(url));
}
export function toEmbedUrl(url) {
    if (!url) {
        return null;
    }
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
    if (youtubeMatch?.[1]) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    const bilibiliMatch = url.match(/bilibili\.com\/video\/([A-Za-z0-9]+)/i);
    if (bilibiliMatch?.[1]) {
        return `https://player.bilibili.com/player.html?bvid=${bilibiliMatch[1]}&page=1`;
    }
    return null;
}
