document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('friends-grid');
    const hitokotoElement = document.getElementById('hitokoto-text');

    // --- 获取随机一言逻辑 ---
    function fetchHitokoto() {
        fetch('https://v1.hitokoto.cn')
            .then(response => response.json())
            .then(data => {
                // 将接口返回的句子写入页面
                hitokotoElement.innerText = data.hitokoto;
            })
            .catch(error => {
                console.error('一言获取失败:', error);
                // 如果 API 挂了或者网络不好，就显示保底的默认文案
                hitokotoElement.innerText = '那些与我交换了宇宙坐标的有趣灵魂。';
            });
    }

    // 执行获取一言
    fetchHitokoto();
    // ---------------------------------

    // --- 以下是原本的友链渲染逻辑 ---
    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('配置文件加载失败');
            }
            return response.json();
        })
        .then(data => {
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = '<div class="error">暂无友链数据。</div>';
                return;
            }

            data.forEach(friend => {
                const card = document.createElement('a');
                card.className = 'friend-card';
                card.href = friend.url;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';

                let imgPath = 'assets/default.png';
                if (friend.icon) {
                    if (friend.icon.startsWith('http')) {
                        imgPath = friend.icon;
                    } else {
                        imgPath = `assets/${friend.icon}`;
                    }
                }

                card.innerHTML = `
                    <img src="${imgPath}" alt="${friend.name}" class="friend-avatar" onerror="this.src='assets/default.png'">
                    <div class="friend-info">
                        <div class="friend-name">${friend.name}</div>
                        <div class="friend-slogan" title="${friend.slogan}">${friend.slogan}</div>
                    </div>
                `;
                
                grid.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            grid.innerHTML = '<div class="error">请检查 config.json 是否配置正确。</div>';
        });
});
