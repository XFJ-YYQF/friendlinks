document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('friends-grid');

    // 获取配置文件
    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('配置文件加载失败');
            }
            return response.json();
        })
        .then(data => {
            // 清空"加载中"的提示
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = '<div class="error">暂无友链数据。</div>';
                return;
            }

            // 渲染卡片
            data.forEach(friend => {
                const card = document.createElement('a');
                card.className = 'friend-card';
                card.href = friend.url;
                card.target = '_blank'; // 新标签页打开
                card.rel = 'noopener noreferrer'; // 安全属性

                // 构建图片路径，默认去 assets 文件夹找
                const imgPath = friend.icon ? `assets/${friend.icon}` : 'assets/default.png';

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
            grid.innerHTML = '<div class="error">无法加载小伙伴的信号，请检查 config.json 是否配置正确。</div>';
        });
});
