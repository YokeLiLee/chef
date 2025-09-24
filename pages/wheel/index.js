Page({
  data: {
    categories: [
      { name: '热菜' },
      { name: '凉菜' },
      { name: '主食' },
      { name: '甜品' },
      { name: '饮品' },
      { name: '小吃' },
      { name: '汤羹' }
    ],
    wheelItems: [],
    spinning: false,
    angle: 0,
    showWheelDrawer: false
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
      const width = 520; // rpx approximated; miniprogram 2d canvas uses px, assume 1 rpx ~= 1 px for simplicity
      const height = 520;
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
    const width = 520;
    const height = 520;
    const radius = 260;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((this.data.angle * Math.PI) / 180);

    const items = this.data.wheelItems;
    const count = items.length;
    if (count === 0) {
      // empty placeholder ring
      ctx.beginPath();
      ctx.fillStyle = '#f5f5f5';
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const colors = ['#ffe6d9','#fff3e0','#e7f5ff','#e6fffb','#f3f0ff','#e8f5e9'];
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
      ctx.font = '16px sans-serif';
      ctx.fillText(items[i], radius * 0.6, 0);
      ctx.restore();
    }

    ctx.restore();
  },

  onAddToWheel(e) {
    const name = e.currentTarget.dataset.name;
    const set = new Set(this.data.wheelItems);
    if (set.size >= 10 && !set.has(name)) {
      wx.showToast({ title: '最多添加 10 个菜品', icon: 'none' });
      return;
    }
    set.add(name);
    const wheelItems = Array.from(set);
    const wheelCount = wheelItems.length;
    this.setData({ wheelItems, wheelCount }, () => this.drawWheel());
  },

    onGo() {
        if (this.data.wheelItems.length === 0 || this.data.spinning) return;
        this.setData({ spinning: true });
        const extraTurns = 4 + Math.floor(Math.random() * 2); // 4-5 turns for snappier feel
        const targetIndex = Math.floor(Math.random() * this.data.wheelItems.length);
        const anglePer = 360 / this.data.wheelItems.length;
        // Pointer calibration
        let targetAngle = (360 - targetIndex * anglePer) - anglePer / 2 - 90;
        targetAngle = (targetAngle % 360 + 360) % 360;

        const duration = 1500 + Math.floor(Math.random() * 1500);  // 1.5 ~ 3s
        const start = Date.now();
        this.currentAngle = this.data.angle % 360; // Sync local angle
        const startAngle = this.currentAngle;

        // Calculate full target with always positive delta for clockwise rotation
        let delta = (targetAngle - startAngle + 360) % 360;
        const fullTargetAngle = startAngle + extraTurns * 360 + delta;

        console.log('starting animation', { startAngle, targetAngle, delta, fullTargetAngle });

        const animate = () => {
            const now = Date.now();
            const t = Math.min(1, (now - start) / duration);
            // easeOutCubic easing
            const eased = 1 - Math.pow(1 - t, 3);
            this.currentAngle = startAngle + eased * (fullTargetAngle - startAngle);
            this.drawWheel();

            console.log('animate frame', t.toFixed(2), this.currentAngle % 360);

            if (t < 1) {
                // Use setTimeout for reliability in MiniProgram
                this.animId = setTimeout(animate, 16);
            } else {
                // Stop: Final precise position
                this.currentAngle = fullTargetAngle;
                this.drawWheel();
                if (this.animId) {
                    clearTimeout(this.animId);
                }
                const finalIndex = targetIndex;
                const result = this.data.wheelItems[finalIndex];
                wx.showToast({ title: `结果：${result}`, icon: 'none' });
                // Only setData at end with normalized angle
                this.setData({ angle: this.currentAngle % 360, spinning: false });
                console.log('animation end', this.currentAngle % 360);
            }
        };

        // Start with setTimeout
        this.animId = setTimeout(animate, 16);
    },

  onOpenWheelDrawer() {
    this.setData({ showWheelDrawer: true });
  },
  onCloseWheelDrawer() {
    this.setData({ showWheelDrawer: false });
  },
  onRemoveFromWheel(e) {
    const name = e.currentTarget.dataset.name;
    const wheelItems = this.data.wheelItems.filter(n => n !== name);
    const wheelCount = wheelItems.length;
    this.setData({ wheelItems, wheelCount }, () => this.drawWheel());
  },
  onClearWheel() {
    this.setData({ wheelItems: [], wheelCount: 0 }, () => this.drawWheel());
  },

  goIndex() { wx.reLaunch({ url: '/pages/index/index' }); },
  goWheel() { /* current */ },
  goTodo() { wx.reLaunch({ url: '/pages/todo/index' }); }
});

