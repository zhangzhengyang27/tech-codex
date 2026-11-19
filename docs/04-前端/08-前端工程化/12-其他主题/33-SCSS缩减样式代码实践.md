---
title: "SCSS 缩减样式代码实践"
description: 总结 14 条 SCSS 实战经验：变量换肤、@import 与局部文件、BEM 嵌套、@mixin/@extend、插值、运算、@for/@each 遍历及 stylelint 样式检查等工程化实践
category: 前端工程化
keywords: [SCSS, Sass, CSS预处理, 样式工程化]
---
# SCSS 缩减样式代码实践

## 概念说明

`Sass` 是 `CSS3` 语言的扩展，能更省事地写出更好的样式表，摆脱重复劳动，让样式工作更有创造性。`Sass` 编译出标准的 `CSS` 代码用于各种生产环境，写出的样式表能够自如地应对修改颜色或修改 `HTML` 标签的变化。`Sass` 语法本身比较简单，难点在于如何将 Sass 运用到实际项目中，解决 `CSS` 存在的痛点，从而提高开发效率。经过实际项目的摸索，以下总结 14 条实践经验，帮助拓宽思路，更好地将 `Sass` 运用到实际项目中。项目使用支持传统类 `CSS` 语法的 **`SCSS`**，所以以下经验总结以 `SCSS` 为例。

## 核心要点

- 变量 `$` 复用属性值，实现"改一处、全局生效"的换肤能力，也可用于图片路径的统一配置。
- SCSS 的 `@import` 在编译期合并文件，与 CSS 原生 `@import`（运行时发起额外请求）有本质区别。
- 下划线开头的局部文件只作导入用，不单独编译输出 CSS，`mixins` 最适合这种组织方式。
- 嵌套 + 父选择器标识符 `&` 是解决 BEM 命名冗长的关键手段。
- `@mixin` 可接受参数，`@extend` 输出更 DRY；需要传参用 `@mixin`，否则用 `@extend`。
- `#{}` 插值可在选择器名、属性名中动态使用变量；配合 `@each` + `map` 可批量生成选择器。
- 样式工程质量靠工具链保障：stylelint 检查、stylefmt（已停更，现用 `stylelint --fix`）修复、gulp-sass 实时编译。
- ⚠️ 注意：CSS 原生 `@import` 只有执行到时浏览器才去下载其他 css 文件，会造成页面加载慢。

## 1、变量 $ 使用

通过变量可以复用属性值，比如颜色、边框大小、图片路径等，做到更改一处、全局更改，从而实现"换肤"功能。

**实例1：组件库利用变量配置，统一更改组件的颜色、字体大小等（换肤）：**

```
$color-primary: #3ecacb;
$color-success: #4fc48d;
$color-warning: #f3d93f;
$color-danger: #f6588e;
$color-info: #27c6fa;
```

**实例2：图片的配置及全局引入**

`SCSS` 中图片的使用可能存在以下 2 个问题：

（1）如果样式文件和使用该样式文件的`vue`文件不在同一目录会出现图片找不到

（2）如果将图片路径配置变量写在`vue`文件的`style`中，但是该写法导致图片和样式分离

解决方案是将图片路径写成配置文件，然后进行全局引入，这样可以统一更改图片路径（并且该方法只会在使用相应图片时进行加载，不会导致额外性能问题）：

```
$common-path: './primary/assets/img/';
$icon-see: $common-path+'icon-see.png';
$icon-play: $common-path+'icon-play.png';
$icon-comment: $common-path+'icon-comment.png';
$icon-checkbox: $common-path+'icon-checkbox.png';
```

## 2、@import 导入Scss文件

（1）`CSS`中的`@import`规则，允许在一个`css`文件中导入其他`css`文件。然而，后果是只有执行到`@import`时，浏览器才会去下载其他`css`文件，这导致页面加载起来特别慢。

（2）`SCSS`中的`@import`规则，不同的是，`SCSS`的`@import`规则在生成`css`文件时就把相关文件导入进来。这意味着所有相关的样式被归纳到了同一个`css`文件中，而无需发起额外的下载请求。

**实例1：组件库中统一将组件的样式文件`import`进`index.scss`中**，然后如果项目中有使用组件库的地方只需要在项目的入口处，引入`index.scss`文件，如下所示在`index.scss`文件中引入各组件的样式文件：

```
@import "./base.scss";
@import "./webupload.scss";
@import "./message-hint.scss";
```

## 3、局部文件命名的使用

`SCSS`局部文件的文件名以下划线开头。这样，`SCSS`就不会在编译时单独编译这个文件输出`css`，而只把这个文件用作导入。在使用`SCSS`时，混合器`mixins`是最适合的使用场景，因为混合器不需要单独编译输出`css`文件。

**实例1：将混合器的名称写成局部文件命名的方式，如下图所示**

![img](https://user-gold-cdn.xitu.io/2019/1/22/168764005e373e18?imageView2/0/w/1280/h/960/format/webp/ignore-error/1) 

## 4、Scss的嵌套功能和父选择器标识符

使用嵌套功能和父选择器标识符 & 可以缩减重复的代码。如果`CSS`类采用`BEM`命名规范，样式类命名存在冗长的问题，使用此功能能解决`BEM`命名冗长的问题，且样式可读性更高。

**实例1：嵌套功能和父选择器标识符 & 解决BEM冗长问题：**

```
.tea-assignhw { 
 &__top {  
  margin: 0;  
} 
 &__content { 
   padding-left: 45px; 
 }  
&__gradeselect { 
   width: 158px;  
 }
}
```

**实例2：**嵌套中使用子选择器、兄弟选择器和伪类选择器

**（1）子选择器**

```
&__hint {
  margin: 20px;  
  font-size: 14px;  
  > p:first-child { 
     font-weight: bold;  
 }
}
```

**（2）兄弟选择器**

```
&__input { 
 width: 220px; 
 & + span {   
   margin-left: 10px;  
 }
}
```

**（3）伪类选择器**

```
&__browse {
  background: url($btn-search) no-repeat;  
&:hover {   
  background: url($btn-search) -80px 0 no-repeat;  
}  
&:visited {  
  background: url($btn-search) -160px 0 no-repeat; 
 }
}
```

## 5、@mixin 混合器和 @extend 指令的使用

变量能够复用属性值，但要复用一大段规则时，传统的做法是把样式表中发现的重复公共规则抽离出来放到新的`CSS`类中。

在`SCSS`中可以使用混合器`@mixin`和`@extend`继承指令来解决复用一大段规则的场景。两者的使用场景有如下区别：

（1）`@mixin`主要的优势就是它能够接受参数。需要传递参数时只能选择`@mixin`，因为`@extend`不能够接受参数。

（2）混合器规则都混入到其他类中，所以在输出的样式表中不能完全避免重复。选择器继承的意思就是让一个选择器能够复用另一个选择器的所有样式，但又不重复输出这些样式属性；即使用`@extend`产生 [DRY CSS](https://link.juejin.im/?target=http%3A%2F%2Fvanseodesign.com%2Fcss%2Fdry-principles%2F)风格的代码（Don't repeat yourself）。

综上所述：需要传参数时只能使用`@mixin`混合器，否则用`@extend`继承来实现更优。

**实例1：@mixin混合器的使用**

```
@mixin paneactive($image, $level, $vertical) { 
  background: url($image) no-repeat $level $vertical;  
  height: 100px;  
  width: 30px; 
  position: relative;  
  top: 50%;
}
&--left-active {  
  @include paneactive($btn-flip, 0, 0);
}
&--right-active { 
  @include paneactive($btn-flip, 0, -105px);
}
```

**实例2：@extend继承的使用**

```
.common-mod {  
  height: 250px;  
  width: 50%;  
  background-color: #fff;  
  text-align: center;
}
&-mod { 
  @extend .common-mod;  
  float: right;
}
&-mod2 { 
  @extend .common-mod;
}
```

## 6、@mixin 混合器默认参数值的使用

在`@include`混合器时不必传入所有的参数，可以给参数指定一个默认值：所传参数是默认值时，`@include`可以省略该参数；不是默认值时，则传入新的参数。

**实例1：@mixin混合器默认参数值的使用**

```
@mixin pane($dir: left) {  
  width: 35px; 
  display: block;  
  float: $dir;  
  background-color: #f1f1f1;
}
&__paneleft { 
  @include pane;
}
&__paneright {
  @include pane(right);
}
```

## 7、#{} 插值的使用

通过 #{} 插值语句可以在选择器或属性名中使用变量。当两个页面的样式类似时，通常会将类似的样式抽取成页面混合器，但两个不同页面的样式命名根据`BEM`命名规范不能一样，这时可使用插值进行动态命名。

**实例1：页面级混合器中的类名利用#{}插值进行动态设置**

```
@mixin home-content($class) { 
 .#{$class} {   
   position: relative;    
   background-color: #fff;    
   overflow-x: hidden;    
   overflow-y: hidden;    
 &--left {     
    margin-left: 160px;  
 }    
 &--noleft {  
    margin-left: 0;  
 } 
 }
}
```

## 8、运算的使用

`SassScript` 支持数字的加减乘除、取整等运算 (+, -, *, /, %)。

**实例1：input组件根据输入框的高度设置左右内边距，如下所示：**

```
.ps-input { 
   display: block;  
   &__inner {   
    -webkit-appearance: none;  
     padding-left: #{$--input-height + 10px};    
     padding-right: #{$--input-height + 10px};    
  }
}
```

## 9、相关scss自带函数的应用

`SCSS`自带一些函数，例如`hsl`、`mix`函数等。

**实例1：button组件的点击后颜色是将几种颜色根据一定的比例混合在一起，生成另一种颜色。**如下所示：

```
&:focus { 
  color: mix($--color-white, $--color-primary, $--button-hover-tint-percent);  
  border-color: transparent;  
  background-color: transparent;}
&:active {  
  color: mix($--color-black, $--color-primary, $--button-active-shade-percent); 
  border-color: transparent;  background-color: transparent;
}
```

## 10、@for 循环的使用

`@for`指令可以在限制的范围内重复输出样式，每次按变量的值对输出结果进行变动。

**实例1：例如项目中需要设置hwicon类底下第2到8个div子节点需设置样式**，如下所示：

```
@for $i from 2 through 8 {  
.com-hwicon {    
 > div:nth-child(#{$i}) {   
   position: relative;    
   float: right;   
  }  
 }
}
```

## 11、each遍历、map数据类型、@mixin/@include混合器、#{}插值 结合使用

结合`each`遍历、`map`数据类型、`@mixin/@include`混合器、#{}插值，可以生成不同的选择器类，并且每个选择器类中的背景图片不同：

```
$img-list: (  
 (accessimg, $papers-access),   
 (folderimg, $papers-folder),  
 (bmpimg, $papers-bmp),   
 (xlsimg, $papers-excel),   
 (xlsximg, $papers-excel),   
 (gifimg, $papers-gif),  
 (jpgimg, $papers-jpg),   
 (unknownimg, $papers-unknown)
);

@each $label, $value in $img-list { 
 .com-hwicon__#{$label} {
    @include commonImg($value); 
 }
}
```

## 12、样式代码检查校验 —— stylelint 插件

`CSS`不能算是严格意义的编程语言，但是在前端体系中却不能小觑。 `CSS` 是以描述为主的样式表，如果描述得混乱、没有规则，对于其他开发者是一个定时炸弹。`CSS` 看似简单，想要写出漂亮的 `CSS` 还是相当困难，因此校验 `CSS` 规则的行动迫在眉睫。`stylelint`是一个强大的现代 `CSS` 检测器，可以让开发者在样式表中遵循一致的约定和避免错误。

**（1）需要安装gulp、stylelint、gulp-postcss、postcss-reporter、stylelint-config-standard，**安装命令为：

```
npm install gulp stylelint gulp-postcss postcss-reporter stylelint-config-standard --save-dev
```

**（2）安装完成后会在项目根目录下创建gulpfile.js文件，文件gulpfile.js配置为：**

```
var gulp = require('gulp');
var postcss = require('gulp-postcss');
var reporter = require('postcss-reporter');
var stylelint = require('stylelint');
var stylelintConfig = {  
  'extends': 'stylelint-config-standard',  
  'rules': {    
  'at-rule-no-unknown': [
     true, {      
     'ignoreAtRules': [   
     'extend',        
     'include',        
     'mixin',       
     'for'      
     ]    
    }
   ]
  }
};
gulp.task('scss-lint', function() { 
   var processors = [    
   stylelint(stylelintConfig),    
   reporter({      
     clearMessages: true,      
     throwError: true    
   })  
   ];  
 return gulp.src(  
   ['src/style/*.scss']// 需要工具检查的scss文件 
  ).pipe(postcss(processors));});
 gulp.task('default', ['scss-lint']);
```

**(3) stylelint-config-standard 检验规则**

`stylelint-config-standard`为`stylelint`官方推荐的标准校验规则，具体校验规则有哪些内容，可参照官网。

**(4)运行命令进行样式检查**

执行 `gulp scss-lint`（或直接运行默认任务 `gulp`）即可对 `src/style/*.scss` 进行样式检查。

## 13、样式自动修复插件 —— stylefmt 插件

`stylefmt` 是一个基于 `stylelint` 的代码修正工具，它可以基于`stylelint`的代码规范约定配置，对可修正的地方作格式化输出。

> 注：`stylefmt` 已停止维护，当前推荐直接使用 `stylelint --fix` 完成样式自动修复。以下为历史用法记录。

**（1）gulp.js配置文件如下：**

```
var stylefmt = require('gulp-stylefmt'); // css格式自动调整工具
gulp.task('stylefmt', function() {
  return gulp.src(   
  ['src/style/student/index.scss' // 需要工具检查的scss文件    
  ]).pipe(stylefmt(stylelintConfig))
    .pipe(gulp.dest('src/style/dest/student'));});
 gulp.task('fix', ['stylefmt']);
```

**（2）运行命令进行样式修复，如下图所示**

![img](https://user-gold-cdn.xitu.io/2019/1/23/16876512b99aef6a?imageView2/0/w/1280/h/960/format/webp/ignore-error/1) 

## 14、将scss语法编译成css语法——gulp-sass 插件

初写`SCSS`代码时，由于对语法不熟悉，写出来的`SCSS`代码所得到的页面效果可能与预期不符。这时可以使用`gulp-sass`插件来监听`SCSS`代码，实时生成`css`代码，通过查看`css`代码，判断所写的`SCSS`代码是否正确。

**（1）gulp.js配置文件如下：**

```
var gulpsass = require('gulp-sass');
gulp.task('gulpsass', function() { 
  return gulp.src('src/style/components/hwIcon.scss')    
  .pipe(gulpsass().on('error', gulpsass.logError))   
  .pipe(gulp.dest('src/style/dest'));});
  gulp.task('watch', function() {  
  gulp.watch('src/style/components/hwIcon.scss', ['gulpsass']);
});
```

**（2）运行命令从而监听scss文件，动态编译scss代码生成css代码文件，如下图所示**

![img](https://user-gold-cdn.xitu.io/2019/1/23/168765265e43e563?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

## 小结

14 条 SCSS 实践经验可归为三层能力：语言层——变量（换肤）、`@import`/局部文件（模块组织）、嵌套与 `&`（BEM 缩写）、`@mixin`/`@extend`（规则复用，传参用 mixin）、`#{}` 插值（动态命名）、运算与内置函数（`mix` 颜色混合）、`@for`/`@each`（批量生成选择器）；工具层——stylelint 检查样式规范、stylefmt（历史方案，现为 `stylelint --fix`）自动修复；编译层——gulp-sass 实时编译 SCSS 为 CSS 便于比对验证。三层结合可以将样式代码的编写、检查、编译纳入完整的工程化流程。
