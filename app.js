document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('friends-grid');
    const hitokotoElement = document.getElementById('hitokoto-text');

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
     * 检测目标 URL 是否可达。
     * 使用 fetch no-cors 模式：网站在线时返回 opaque 响应（视为成功），
     * 彻底宕机或 DNS 解析失败时抛出网络错误（视为失败）。
     * 5 秒超时后自动判定为离线。
     */
    function checkConnectivity(url) {
        return new Promise((resolve) => {
            const controller = new AbortController();
            const timer = setTimeout(() => {
                controller.abort();
                resolve(false);
            }, 5000);

            fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            })
            .then(() => {
                clearTimeout(timer);
                resolve(true);
            })
            .catch(() => {
                clearTimeout(timer);
                resolve(false);
            });
        });
    }

    /**
     * 渲染单张友链卡片。
     * isOwner：是否为站长主页（展示置顶标记）
     * isOnline：连通性检测结果（决定绿点/红点）
     * isPending：还在检测中（展示灰色动态点）
     */
    function createCard(friend, isOnline, isPending) {
        const card = document.createElement('a');
        card.className = 'friend-card';
        card.href = friend.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        if (friend.isOwner) card.classList.add('owner-card');

        let imgPath = 'assets/default.png';
        if (friend.icon) {
            imgPath = friend.icon.startsWith('http') ? friend.icon : `assets/${friend.icon}`;
        }

        // 状态点 class
        let dotClass = isPending ? 'status-dot pending' : (isOnline ? 'status-dot online' : 'status-dot offline');
        let dotTitle = isPending ? '检测中...' : (isOnline ? '可访问 ✓' : '暂时无法访问');

        card.innerHTML = `
            <img src="${imgPath}" alt="${friend.name}" class="friend-avatar" onerror="this.src='assets/default.png'">
            <div class="friend-info">
                <div class="friend-name">
                    ${friend.isOwner ? '<span class="owner-badge">站长</span>' : ''}
                    ${friend.name}
                </div>
                <div class="friend-slogan" title="${friend.slogan}">${friend.slogan}</div>
                <div class="friend-meta">
                    <span class="${dotClass}" title="${dotTitle}"></span>
                    <span class="status-label">${dotTitle}</span>
                </div>
            </div>
        `;
        return card;
    }

    // 加载友链配置，并发检测连通性，排序后渲染
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

            // 先渲染占位骨架（全部灰点 pending 状态），让页面立即有内容
            grid.innerHTML = '';
            const cardMap = new Map(); // url -> DOM element
            data.forEach(friend => {
                const card = createCard(friend, false, true);
                cardMap.set(friend.url, card);
                grid.appendChild(card);
            });

            // 并发检测所有连通性
            const checks = data.map(friend => {
                if (friend.isOwner) {
                    // 站长主页不检测，直接视为在线
                    return Promise.resolve({ friend, isOnline: true });
                }
                return checkConnectivity(friend.url).then(isOnline => ({ friend, isOnline }));
            });

            Promise.all(checks).then(results => {
                // 排序：站长置顶 → 在线 → 离线
                results.sort((a, b) => {
                    if (a.friend.isOwner) return -1;
                    if (b.friend.isOwner) return 1;
                    return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
                });

                // 清空并按排序结果重新渲染（已有检测结果，去掉 pending 状态）
                grid.innerHTML = '';
                results.forEach(({ friend, isOnline }) => {
                    grid.appendChild(createCard(friend, isOnline, false));
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

    applyBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
});
