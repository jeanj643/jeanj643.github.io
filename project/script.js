// 添加一些交互效果
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', function(e) {
        // 创建点击波纹效果
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Logo 3D 效果
const logo = document.querySelector('.logo-image');

logo.addEventListener('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // 计算鼠标相对于logo中心的偏移量（-1到1之间）
    const rotateX = (mouseY - centerY) / (rect.height / 2);
    const rotateY = (centerX - mouseX) / (rect.width / 2);
    
    // 限制角度在20度以内
    const maxAngle = 20;
    const angleX = rotateX * maxAngle;
    const angleY = rotateY * maxAngle;
    
    // 应用3D变换
    this.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.05)`;
});

logo.addEventListener('mouseleave', function() {
    // 鼠标离开时恢复原状
    this.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
});

logo.addEventListener('mouseenter', function() {
    // 鼠标进入时添加轻微的放大效果
    this.style.transition = 'transform 0.2s ease-out';
}); 