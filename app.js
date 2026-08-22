document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('friends-grid');
    const hitokotoElement = document.getElementById('hitokoto-text');

    // 转义 HTML 特殊字符，防止 config.json 中的外部投稿（name/slogan/icon）
    // 被当作 HTML/属性注入，造成存储型 XSS
    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // 仅允许 http/https 协议的链接，拦截 javascript: 等危险协议
    function safeUrl(url) {
        try {
            const u = new URL(String(url), window.location.href);
            return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '#';
        } catch {
            return '#';
        }
    }

    // 获取随机一言
    function fetchHitokoto() {
        fetch('https://v1.hitokoto.cn')
            .then(response => response.json())
            .then(data => {
                hitokotoElement.innerText = data.hitokoto;
            })
            .catch(error => {
                console.error('一言获取失败:', error);
                hitokotoElement.innerText = '那些与我交换了宇宙坐标的有趣灵魂。';
            });
    }
    fetchHitokoto();

    /**
     * 检测目标 URL 是否可达，返回三种状态：
     *   true       → 在线（绿点）
     *   false      → 离线/超时（红点）
     *   'http-only' → HTTP站点，HTTPS页面无法检测（黄点）
     *
     * 针对 http:// 链接：先自动升级到 https:// 尝试，
     * 若 HTTPS 通了则为绿，若超时/失败则为黄（而非红，
     * 因为混合内容拦截不等于网站挂了）。
     */
    function checkConnectivity(url) {
        return new Promise((resolve) => {
            const isHttp = url.startsWith('http://');

            function tryFetch(targetUrl, onSuccess, onFail) {
                const controller = new AbortController();
                const timer = setTimeout(() => {
                    controller.abort();
                    onFail();
                }, 5000);
                fetch(targetUrl, {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                })
                .then(() => { clearTimeout(timer); onSuccess(); })
                .catch(() => { clearTimeout(timer); onFail(); });
            }

            if (isHttp) {
                // 先尝试 HTTPS 升级版本
                const httpsUrl = url.replace('http://', 'https://');
                tryFetch(
                    httpsUrl,
                    () => resolve(true),           // HTTPS 通了 → 绿
                    () => resolve('http-only')      // HTTPS 也不通 → 黄（HTTP站点，无法从HTTPS页检测）
                );
            } else {
                tryFetch(
                    url,
                    () => resolve(true),
                    () => resolve(false)
                );
            }
        });
    }

    // status: true | false | 'http-only' | 'pending'
    function getStatusConfig(status) {
        switch (status) {
            case true:        return { dotClass: 'online',    label: '可访问' };
            case false:       return { dotClass: 'offline',   label: '无法访问' };
            case 'http-only': return { dotClass: 'http-only', label: 'HTTP 站点' };
            default:          return { dotClass: 'pending',   label: '检测中...' };
        }
    }

    function createCard(friend, status, index) {
        const card = document.createElement('a');
        card.className = 'friend-card';
        card.href = safeUrl(friend.url);
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--i', index);
        if (friend.isOwner) card.classList.add('owner-card');

        let imgPath = 'assets/default.png';
        if (friend.icon) {
            imgPath = friend.icon.startsWith('http')
                ? safeUrl(friend.icon)
                : `assets/${String(friend.icon).replace(/[^a-zA-Z0-9._-]/g, '')}`;
        }

        const { dotClass, label } = getStatusConfig(status);
        const safeName = escapeHtml(friend.name);
        const safeSlogan = escapeHtml(friend.slogan);

        card.innerHTML = `
            <img src="${escapeHtml(imgPath)}" alt="${safeName}" class="friend-avatar" width="56" height="56" loading="lazy" decoding="async">
            <div class="friend-info">
                <div class="friend-name">
                    ${friend.isOwner ? '<span class="owner-badge">站长</span>' : ''}
                    ${safeName}
                </div>
                <div class="friend-slogan" title="${safeSlogan}">${safeSlogan}</div>
                <div class="friend-meta">
                    <span class="status-dot ${dotClass}"></span>
                    <span class="status-label">${label}</span>
                </div>
            </div>
        `;

        // 图片加载失败时回退默认头像（用 JS 绑定而非内联 onerror，
        // 以配合严格的 CSP script-src 'self' 策略）
        const img = card.querySelector('img');
        img.addEventListener('error', () => { img.src = 'assets/default.png'; }, { once: true });

        return card;
    }

    fetch('config.json')
        .then(response => {
            if (!response.ok) throw new Error('配置文件加载失败');
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                grid.innerHTML = '<div class="error">暂无友链数据。</div>';
                return;
            }

            // 先渲染 pending 占位卡片
            grid.innerHTML = '';
            data.forEach((friend, index) => grid.appendChild(createCard(friend, 'pending', index)));

            // 并发检测
            const checks = data.map(friend => {
                if (friend.isOwner) {
                    return Promise.resolve({ friend, status: true });
                }
                return checkConnectivity(friend.url).then(status => ({ friend, status }));
            });

            Promise.all(checks).then(results => {
                // 排序：站长置顶 → 在线(true) → HTTP站点('http-only') → 离线(false)
                const order = { true: 0, 'http-only': 1, false: 2 };
                results.sort((a, b) => {
                    if (a.friend.isOwner) return -1;
                    if (b.friend.isOwner) return 1;
                    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
                });

                grid.innerHTML = '';
                results.forEach(({ friend, status }, index) => {
                    grid.appendChild(createCard(friend, status, index));
                });
            });
        })
        .catch(error => {
            console.error('Error:', error);
            grid.innerHTML = '<div class="error">请检查 config.json 是否配置正确</div>';
        });

    // 弹窗控制逻辑
    const modal = document.getElementById('apply-modal');
    const applyBtn = document.getElementById('apply-btn');
    const closeBtn = document.querySelector('.close-btn');

    applyBtn.addEventListener('click', () => modal.classList.add('show'));
    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
});
