Page({
  data: {
    categories: [
        { name: '炒菜', emoji: '🔥' },
        { name: '漂亮饭', emoji: '🥗' },
        { name: '肉蟹煲', emoji: '🍚' },
        { name: '日料', emoji: '🍰' },
        { name: '韩料', emoji: '🥤' },
        { name: '火锅', emoji: '🍲' },
        { name: '串串香', emoji: '🍡' },
        { name: '汉堡包', emoji: '🍔' },
        { name: '烤鱼', emoji: '🍜' },
        { name: '泰餐', emoji: '🍜' },
        { name: '烤肉', emoji: '🍜' },
        { name: '披萨', emoji: '🍜' }
    ],
    wheelItemNames: [],
    wheelItems: [],
    spinning: false,
    angle: 0,
    showWheelDrawer: false,
    animating: {}
  },

  onLoad() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas').node();
    query.exec(res => {
      const canvas = res[0] && res[0].node;
      if (!canvas) return;
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;
      const width = 600; // rpx approximated; miniprogram 2d canvas uses px, assume 1 rpx ~= 1 px for simplicity
      const height = 600;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style = canvas.style || {};
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      this.drawWheel();
    });
  },

  drawWheel() {
    const ctx = this.ctx;
    if (!ctx) return;
    const width = 600;
    const height = 600;
    const radius = 300;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((this.data.angle * Math.PI) / 180);

    const items = this.data.wheelItems;
    const count = items.length;
    if (count === 0) {
      // empty placeholder ring
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(
          -radius * Math.cos(135 * Math.PI / 180), // start x
          -radius * Math.sin(135 * Math.PI / 180), // start y
          radius * Math.cos(135 * Math.PI / 180),  // end x
          radius * Math.sin(135 * Math.PI / 180)   // end y
      );
      gradient.addColorStop(0, '#ffe6d9'); // Start color
      gradient.addColorStop(1, '#fff3e0'); // End color
      ctx.fillStyle = gradient;
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

      const colors = [
          '#ffe6d9', // Light peach
          '#fff3e0', // Light cream
          '#e7f5ff', // Light sky blue
          '#e6fffb', // Light aqua
          '#f3f0ff', // Light lavender
          '#e8f5e9', // Light mint green
          '#fff0f5', // Added: Light blush pink
          '#f0f8ff', // Added: Light alice blue
          '#f5f5e0', // Added: Light cream yellow
          '#e6f0fa', // Added: Light periwinkle
          '#f0fff0', // Added: Light honeydew
          '#fff5ee'  // Added: Light seashell
      ];
    const anglePer = (2 * Math.PI) / count;

    for (let i = 0; i < count; i += 1) {
      const start = i * anglePer;
      const end = start + anglePer;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fillStyle = colors[i % colors.length];
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fill();

      // text
      ctx.save();
      ctx.rotate(start + anglePer / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333';
      ctx.font = '60px sans-serif';
      ctx.fillText(items[i], radius * 0.6, 0);
      ctx.restore();
    }

    ctx.restore();
  },

    onAddToWheel(e) {
        const emoji = e.currentTarget.dataset.emoji;
        const set = new Set(this.data.wheelItems);
        if (set.size >= 10 && !set.has(emoji)) {
            wx.showToast({ title: '最多添加 10 个菜品', icon: 'none' });
            return;
        }
        set.add(emoji);
        const wheelItems = Array.from(set);
        const wheelItemNames = wheelItems.map(emoji => {
            const category = this.data.categories.find(cat => cat.emoji === emoji);
            return category ? category.name : emoji; // Fallback to emoji if no match
        });
        const wheelCount = wheelItems.length;
        const animating = { ...this.data.animating, [emoji]: true }; // Trigger animation
        this.setData({ wheelItems, wheelItemNames, wheelCount, animating }, () => {
            this.drawWheel();
            // Reset animation after 300ms (matches animation duration)
            setTimeout(() => {
                this.setData({ [`animating.${emoji}`]: false });
            }, 300);
        });
    },

  onGo() {
    if (this.data.wheelItems.length === 0 || this.data.spinning) return;
    this.setData({ spinning: true });
    const extraTurns = 4 + Math.floor(Math.random() * 5); // 4-8 turns
    const targetIndex = Math.floor(Math.random() * this.data.wheelItems.length);
    const anglePer = 360 / this.data.wheelItems.length;
    const targetAngle = extraTurns * 360 + (270 - targetIndex * anglePer) - anglePer / 2; // align pointer to segment center

    const duration = 3000;
    const start = Date.now();
    const startAngle = this.data.angle % 360;
    const animate = () => {
      const now = Date.now();
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const angle = startAngle + eased * (targetAngle - startAngle);
      this.setData({ angle }, () => this.drawWheel());
      if (t < 1) {
        this.animId = this.canvas.requestAnimationFrame(animate);
      } else {
          this.setData({ spinning: false });
          const finalIndex = targetIndex;
          const emoji = this.data.wheelItems[finalIndex];
          const category = this.data.categories.find(cat => cat.emoji === emoji); // Modified: Map emoji to name
          const result = category ? category.name : emoji; // Modified: Use name for toast
          wx.showToast({ title: `去吃: ${result}`, icon: 'none' }); // Modified: Shows name instead of emoji
      }
    };
    this.animId = this.canvas.requestAnimationFrame(animate);
  },

  onOpenWheelDrawer() {
    this.setData({ showWheelDrawer: true });
  },
  onCloseWheelDrawer() {
    this.setData({ showWheelDrawer: false });
  },
  onRemoveFromWheel(e) {
    const emoji = e.currentTarget.dataset.emoji; // Modified: Changed from dataset.name to dataset.emoji
    const wheelItems = this.data.wheelItems.filter(n => n !== emoji); // Modified: Filter by emoji
    const wheelItemNames = wheelItems.map(emoji => {
      const category = this.data.categories.find(cat => cat.emoji === emoji);
      return category ? category.name : emoji; // Fallback to emoji
    }); // Added: Update names for drawer
    const wheelCount = wheelItems.length;
    this.setData({ wheelItems, wheelItemNames, wheelCount }, () => this.drawWheel());
  },
  onClearWheel() {
    this.setData({ wheelItems: [], wheelItemNames: [], wheelCount: 0 }, () => this.drawWheel());
  },

  goIndex() { wx.reLaunch({ url: '/pages/index/index' }); },
  goWheel() { /* current */ },
  goTodo() { wx.reLaunch({ url: '/pages/todo/index' }); }
});

