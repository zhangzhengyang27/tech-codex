/**
 * 打字机泵：把网络层高速到达的 SSE token 平滑为肉眼可见的逐字输出。
 *
 * 背景：DeepSeek 生成速度约 500 字/秒，短回答 1 秒出头就流完，
 * 肉眼看到的是"整段蹦出"而非打字机效果。本泵在网络层与渲染层之间解耦：
 * token 高频 push（零渲染成本，只进缓冲），渲染按固定节奏逐帧取字——
 * 下限 3 字/帧（≈90 字/秒，起步即有打字感），随已输出篇幅按比例加速，
 * 长回答不会落后于生成速度，短回答也有清晰的逐字过程。
 */
export class TypewriterPump {
  private buffer = "";
  private text = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private finished = false;
  private listener: ((text: string) => void) | null = null;
  private onFinished: ((fullText: string) => void) | null = null;
  private readonly tickMs: number;

  constructor(tickMs = 33) {
    this.tickMs = tickMs;
  }

  /** 订阅可见文本变化（每帧最多回调一次） */
  subscribe(listener: (text: string) => void): void {
    this.listener = listener;
  }

  /** 流结束且缓冲排空后的回调（携带完整文本，供提交到消息列表） */
  onFinish(callback: (fullText: string) => void): void {
    this.onFinished = callback;
  }

  /** 流式追加（高频调用，零渲染成本：只进缓冲） */
  push(delta: string): void {
    if (!delta) return;
    this.buffer += delta;
    this.ensurePumping();
  }

  /** 正常结束：排空剩余缓冲后触发 onFinish */
  end(): void {
    this.finished = true;
    if (!this.timer) {
      if (this.buffer.length > 0) this.ensurePumping();
      else this.stopAndFinish();
    }
  }

  /** 当前可见文本 */
  get current(): string {
    return this.text;
  }

  /** 立即全部显示（停止/出错时用） */
  flush(): string {
    this.text += this.buffer;
    this.buffer = "";
    this.stopAndFinish();
    return this.text;
  }

  /** 新一轮回答开始前重置 */
  reset(): void {
    this.buffer = "";
    this.text = "";
    this.finished = false;
    this.stopAndFinish();
  }

  private ensurePumping(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  private stopAndFinish(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.finished) {
      const full = this.text;
      // onFinish 只在正常 end() 路径触发一次；flush/reset 路径由调用方自行处理
      this.finished = false;
      this.onFinished?.(full);
    }
    this.emit();
  }

  private tick(): void {
    const pending = this.buffer.length;
    if (pending === 0) {
      if (this.finished) this.stopAndFinish();
      else this.stopTimer();
      return;
    }
    // 下限 3 字/帧（≈90 字/秒）保证起步即有打字感；随篇幅 1.5% 比例加速，长回答不积压
    const take = Math.min(pending, Math.max(3, Math.round(this.text.length * 0.015)));
    this.text += this.buffer.slice(0, take);
    this.buffer = this.buffer.slice(take);
    this.emit();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private emit(): void {
    this.listener?.(this.text);
  }
}
