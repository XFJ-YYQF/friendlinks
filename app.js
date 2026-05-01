document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('friends-grid');

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
            grid.innerHTML = '<div class="error">请检查 config.json 是否配置正确</div>';
        });
});
