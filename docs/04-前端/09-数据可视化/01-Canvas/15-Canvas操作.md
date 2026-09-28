---
title: "Canvas 操作"
description: "Canvas 进阶操作：ImageData 像素级读写与置灰/马赛克案例、save/restore 状态管理、translate/rotate/scale 变换、globalAlpha 与 clip/globalCompositeOperation 合成。"
keywords: [Canvas, ImageData, 变换, 合成]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---

# Canvas 操作

## canvas 像素级操作

### ImageData() 对象

ImageData 是图片的数据化，它具备以下属性：

- data：Uint8ClampedArray [r,g,b,a, r,g,b,a, r,g,b,a, r,g,b,a]
- width：整数
- height：整数

注：Uint8ClampedArray 翻译过来是 8位无符号整型固定数组，其取值范围是[0,255]。若小于0，则为0，大于255，则为255。若为小数，则取整，取整的方法是银行家舍入。

### 获取 ImageData() 对象

1.直接建立ImageData() 对象（相当于自己新建了一张图片）

```javascript
new ImageData()
new ImageData(width, height)  
new ImageData(Uint8ClampedArray, width, height)

ctx.createImageData()
ctx.createImageData(width, height)
ctx.createImageData(ImageData)
```

2.获取canvas 的ImageData() 对象（可以以此原理获取真实图片的数据）

```javascript
ctx.getImageData(x, y, width, height)
```

### 在 canvas 中显示 ImageData

putImageData(ImageData, dx, dy, x, y, w, h) 将 ImageData 对象显示在 canvas 画布之中

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221359543.png)

代码示例：

```javascript
const canvas=document.getElementById('canvas');
//canvas充满窗口
canvas.width=window.innerWidth;
canvas.height=window.innerHeight;
const ctx=canvas.getContext('2d');

const img=new Image();
img.src='./images/dog.jpg';
img.onload=function(){
  //获取图片宽高
  const {width,height}=img;

  /*1.在canvas 中绘制图像*/
  ctx.drawImage(img,0,0);

  /*2.从canvas 中获取图像的ImageData*/
  const imgData=ctx.getImageData(0,0,width,height);

  /*3.在canvas 中显示ImageData*/
  ctx.putImageData(
    imgData,
    //位置
    0,height,
    //裁剪
    150,150,
    100,100
  )
};
```

### 操作像素

#### 理解 ImageData 中的像素集合和图像栅格的对应关系

ImageData 对象的属性：

- data：Uint8ClampedArray [0,1,2,3, 4,5,6,7,8,9,10,11,12,13,14,15]
- width：2
- height：2

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221359601.png)

#### 遍历像素集合的方法

- 逐像素遍历：每隔4 个数据遍历一次，简单快捷

```javascript
for(let i=0;i<data.length;i+=4){
  let r=data[i+0];
  let g=data[i+1];
  let b=data[i+2];
  let a=data[i+3];
  console.log(r,g,b,a)
}
```

- 行列遍历：基于行列遍历，可获取像素点的位置信息

```javascript
for(let y=0;y<h;y++){
  for(let x=0;x<w;x++){
    let ind=(y*w+x)*4;
    let r=data[ind];
    let g=data[ind+1];
    let b=data[ind+2];
    let a=data[ind+3];
    console.log(r,g,b,a)
  }
}
```

### 案例1-图像置灰

我们逐像素遍历ImageData 对象中的每个像素，然后将其置灰，效果如下：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221359614.png)

像素置灰的算法是：

```javascript
const lm =0.299*r + 0.587*g + 0.114*b
```

### 案例2-马赛克效果

我们可以逐行列遍历ImageData 对象里的像素，将特定区域的颜色变成色块，从而变成马赛克效果。

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221359664.png)



我们可以通过不同的算法，对 ImageData 中的像素进行不同的处理。比如调整图片的色调，检测图像边缘，实现艺术效果……

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221359779.png)

## canvas 变换

### 状态管理

状态管理，管理的是上下文对象的状态。

上下文对象的状态就是上下文对象的属性。比如描边颜色，填充颜色，投影，线条样式，变换信息…

管理上下文状态的方法有两个：

- 保存当前状态：save()
- 恢复上一次保存的状态：restore()

一般在我们绘制具备同一种样式的图形时，都会用 save() restore() 将其包裹起来。这是为了避免当前的图形样式影响以后所要绘制的图形样式。

状态是可以嵌套的：

```javascript
a - save()
    b - save()
    restore() – b
restore() – a
```

代码示例：

```javascript
ctx.save();
ctx.fillStyle='green';
ctx.fillRect(50,50,400,200);
ctx.restore();

ctx.save();
ctx.fillStyle='red';
ctx.fillRect(50,300,400,200);
ctx.restore();
```

### 变换

变换的本质是对 canvas 坐标系的操作

变换有3个特性：

- 移动： translate(x,y)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221401267.png)

代码示例：

```javascript
ctx.fillStyle='green';
ctx.translate(100,100);
ctx.fillRect(100,100,400,200);
```

- 旋转： rotate(angle)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221401324.webp)

代码示例：

```javascript
ctx.fillStyle='green';
ctx.rotate(Math.PI/24);
ctx.fillRect(100,100,400,200);
```

- 缩放： scale(x,y)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221401430.png)

代码示例：

```javascript
ctx.fillStyle='green';
ctx.scale(0.5,0.5);
ctx.fillRect(100,100,400,200);
```

### 矩阵变换

我们之前所说的 translate(x,y)、rotate(angle) 和 scale(x,y) 方法都是属于矩阵变换的。

除此之外canvas 还提供了两个完整的矩阵变换方法：

- 相对变换矩阵：transform(a, b, c, d, e, f)
- 绝对变换矩阵：setTransform(a, b, c, d, e, f)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221401470.png)

解释一下上面的参数：

- a,d ：x，y 轴向的缩放，默认为 1
- c,b ：x，y 轴向的倾斜，默认为 0
- e,f ：x，y 轴向的位移，默认为 0

关于矩阵变换的算法，我们这里先不做详解，其中涉及的知识量有点大，之后咱们会再单独拿出一篇文章来说矩阵。

### 案例-钟表

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221401518.webp)

当前案例会用到两种变换：

- 位移，将坐标原点移至canvas 画布中心
- 旋转，将x轴逆时针旋转90°，与钟表的零点对齐

## canvas 合成

### 透明度合成 globalAlpha

globalAlpha 就是全局对象的透明度，全局对象就是 canvas 的上下文对象。 使用方法：`ctx.globalAlpha=0.6`

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221403638.png)

代码示例：

```javascript
ctx.save();
ctx.globalAlpha=0.5;
ctx.fillRect(50,50,400,200);
ctx.fillRect(150,150,400,200);
ctx.restore();
ctx.fillRect(250,250,400,200);
```

注意：globalAlpha 要和颜色里的rgba 区别一下

rgba 控制的是某种颜色的透明度；

globalAlpha 相当于给之后绘制的所有图形统一设置透明度。

### 路径裁剪 clip

路径裁剪就是在画布上设置一个路径，让我们之后绘制的图像只显示在这个路径之中。

路径裁剪的步骤：

1. 定义路径
2. ctx.clip()
3. 绘制其它图形

代码示例：

```javascript
ctx.beginPath();
ctx.arc(300,300,100,0,Math.PI*2);
ctx.stroke();
ctx.clip();
ctx.fillRect(300,300,100,100);
```

### 全局合成 globalCompositeOperation

全局合成是 canvas 画布中的已绘图像和将绘图像的融合方式

我们可以从形状和色彩两方面解读全局合成

以下图为例，说一下全局合成的步骤

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221403730.png)

[更多……](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial/Compositing)

1. 先画一个黄色的正方形
2. 设置全局合成的属性
3. 再绘制一个绿色的圆

绿色的圆会基于全局合成属性与黄色的正方形合成

### 合成示例-刮刮乐

刮刮乐的绘制步骤：

1.用 css 在 canvas 中添加一个背景

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221403777.png)

2.在 canvas 中绘制一张遮罩图

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221403812.png)

3.在canvas 画布中实现手绘效果

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221403848.png)

4.将手绘效果与遮罩做destination-out 合成

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309221403904.png)

### 总结

已绘制到 canvas 上的图像不可被修改，只能被覆盖或擦除

路径裁剪是基于路径的一种合成方式，它只能使用路径设置裁剪区域，如果是文字的话，就无效

透明度合成和全局合成都是基于像素的操作