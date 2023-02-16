/**
 * QQ空间日志模块的导出API
 * @author https://lvshuncai.com
 */

/**
 * 导出日志数据
 */
API.Blogs.export = async() => {

    // 模块总进度更新器
    const indicator = new StatusIndicator('Blogs_Row_Infos');
    indicator.print();

    try {
        // 获取所有的日志数据
        let items = await API.Blogs.getAllList();
        console.log('日志列表获取完成，共有日志%i篇', items.length);

        // 添加下载任务
        API.Blogs.handerListImages(items);

        // 获取日志内容
        items = await API.Blogs.getAllContents(items);
        console.log('日志内容获取完成，共有日志%i篇', items.length);

        // 获取所有的日志评论
        items = await API.Blogs.getItemsAllCommentList(items);

        // 获取日志点赞列表
        await API.Blogs.getAllLikeList(items);

        // 获取日志最近浏览
        await API.Blogs.getAllVisitorList(items);

        // 根据导出类型导出数据    
        await API.Blogs.exportAllListToFiles(items);

    } catch (error) {
        console.error('日志导出异常', error);
    }

    // 完成
    indicator.complete();
}

/**
 * 获取所有日志的内容
 * @param {Array} items 日志列表
 */
API.Blogs.getAllContents = async(items) => {
    // 进度更新器
    const indicator = new StatusIndicator('Blogs_Content');
    indicator.setTotal(items.length);

    for (let index = 0; index < items.length; index++) {
        let item = items[index];

        // 更新状态-当前位置
        indicator.setIndex(index + 1);

        if (!API.Common.isNewItem(item)) {
            // 已备份数据跳过不处理
            indicator.addSkip(item);
            continue;
        }

        await API.Blogs.getInfo(item.blogId).then(async(data) => {
                // 添加成功提示
                indicator.addSuccess(data);
                // 加载日志页面
                const blogPage = jQuery(data);

                // 基于DOM获取详细信息
                const detailItem = API.Blogs.readDetailInfo(blogPage);
                item = detailItem && Object.assign(item, detailItem);

                // 获得网页中的日志正文
                const $detailBlog = blogPage.find("#blogDetailDiv:first");

                // 是否为模板日志
                if (API.Blogs.isTemplateBlog(item)) {
                    // 模板日志，日志内容在变量中
                    $detailBlog.html(API.Blogs.readTemplateContent(blogPage));
                }

                // 添加原始HTML
                item.html = API.Utils.utf8ToBase64($detailBlog.html());

                // 处理图片信息
                await API.Blogs.handerContentImages(item, $detailBlog.find("img"));

                // 处理视频信息
                await API.Blogs.handerMedias(item, $detailBlog.find("embed"));

                // 更改自定义标题
                item.custom_title = item.title;
                // 添加自定义HTML
                item.custom_html = API.Utils.utf8ToBase64($detailBlog.html());
                // 添加点赞Key
                item.uniKey = API.Blogs.getUniKey(item.blogid || item.blogId);

                items[index] = item;
            }).catch((e) => {
                console.error("获取日志内容异常", item, e);
                // 添加失败提示
                indicator.addFailed(item);
            })
            // 等待一下再请求
        let min = QZone_Config.Blogs.Info.randomSeconds.min;
        let max = QZone_Config.Blogs.Info.randomSeconds.max;
        let seconds = API.Utils.randomSeconds(min, max);
        await API.Utils.sleep(seconds * 1000);
    }
    // 完成
    indicator.complete();
    return items;
}


/**
 * 获取单页的日志列表
 * @param {integer} pageIndex 指定页的索引
 * @param {StatusIndicator} indicator 状态更新器
 */
API.Blogs.getList = async(pageIndex, indicator) => {
    // 状态更新器当前页
    indicator.index = pageIndex + 1;
    return await API.Blogs.getBlogs(pageIndex).then(async(data) => {
        // 去掉函数，保留json
        data = API.Utils.toJson(data, /^_Callback\(/);
        if (data.code < 0) {
            // 获取异常
            console.warn('获取日志列表异常：', data);
        }
        data = data.data || {};

        // 更新状态-下载中的数量
        indicator.addDownload(QZone_Config.Blogs.pageSize);

        // 更新状态-总数
        QZone.Blogs.total = data.totalNum || QZone.Blogs.total || 0;
        indicator.setTotal(QZone.Blogs.total);

        let dataList = data.list || [];

        // 更新状态-下载成功数
        indicator.addSuccess(dataList);

        return dataList;
    })
}


/**
 * 获取所有日志列表
 */
API.Blogs.getAllList = async() => {

    // 日志状态更新器
    const indicator = new StatusIndicator('Blogs');

    // 开始
    indicator.print();

    const CONFIG = QZone_Config.Blogs;

    const nextPage = async function(pageIndex, indicator) {

        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Blogs.getList(pageIndex, indicator).then(async(dataList) => {

            // 设置比较信息
            dataList = API.Common.setCompareFiledInfo(dataList, 'pubTime', 'pubtime');

            // 合并数据
            QZone.Blogs.Data = API.Utils.unionItems(QZone.Blogs.Data, dataList);
            if (!API.Common.isGetNextPage(QZone.Blogs.OLD_Data, dataList, CONFIG)) {
                // 不再继续获取下一页
                return QZone.Blogs.Data;
            }
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, QZone.Blogs.total, QZone.Blogs.Data, arguments.callee, nextPageIndex, indicator);

        }).catch(async(e) => {
            console.error("获取日志列表异常，当前页：", pageIndex + 1, e);
            indicator.addFailed(new PageInfo(pageIndex, CONFIG.pageSize));
            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, QZone.Blogs.total, QZone.Blogs.Data, arguments.callee, nextPageIndex, indicator);
        });
    }

    await nextPage(0, indicator);

    // 合并、过滤数据
    QZone.Blogs.Data = API.Common.unionBackedUpItems(CONFIG, QZone.Blogs.OLD_Data, QZone.Blogs.Data);

    // 排序
    QZone.Blogs.Data = API.Blogs.sort(QZone.Blogs.Data);

    // 完成
    indicator.complete();

    return QZone.Blogs.Data;
}


/**
 * 获取所有日志的评论列表
 * @param {string} item 日志
 */
API.Blogs.getItemsAllCommentList = async(items) => {
    if (!QZone_Config.Blogs.Comments.isFull) {
        // 不获取全部评论时，跳过
        return items;
    }

    // 单条日志状态更新器
    const indicator = new StatusIndicator('Blogs_Comments');
    indicator.setTotal(items.length);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 更新当前位置
        indicator.setIndex(i + 1);

        if (!API.Common.isNewItem(item)) {
            // 已备份数据跳过不处理
            indicator.addSkip(item);
            continue;
        }

        // 预防日志无评论
        item.comments = item.comments || [];

        // 获取日志的全部评论
        await API.Blogs.getItemAllCommentList(item);

        // 添加成功
        indicator.addSuccess(item);
    }

    // 已完成
    indicator.complete();
    return items;
}

/**
 * 获取单条日志的单页评论列表
 * @param {object} item 日志
 * @param {integer} pageIndex 页数索引
 */
API.Blogs.getItemCommentList = async(item, pageIndex) => {
    return await API.Blogs.getComments(item.blogid, pageIndex).then(async(data) => {
        // 去掉函数，保留json
        data = API.Utils.toJson(data, /^_Callback\(/);
        if (data.code < 0) {
            // 获取异常
            console.warn('获取单条日志的单页评论列表异常：', data);
        }
        data = data.data || {};
        return data.comments || [];
    });
}

/**
 * 获取单条日志的全部评论列表
 * @param {object} item 日志
 */
API.Blogs.getItemAllCommentList = async(item) => {
    if (!(item.replynum > item.comments.length)) {
        // 当前列表比评论总数小的时候才需要获取全部评论，否则则跳过
        return item.comments;
    }
    // 清空原有的评论列表
    item.comments = [];

    // 日志评论配置
    const CONFIG = QZone_Config.Blogs.Comments;

    // 更新总数
    const total = item.replynum || 0;

    const nextPage = async function(item, pageIndex) {

        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Blogs.getItemCommentList(item, pageIndex).then(async(dataList) => {

            // 合并评论列表
            item.comments = item.comments.concat(dataList || []);

            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, total, item.comments, arguments.callee, item, nextPageIndex);
        }).catch(async(e) => {
            console.error("获取日志评论列表异常，当前页：", pageIndex + 1, item, e);
            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, total, item.comments, arguments.callee, item, nextPageIndex);
        });
    }

    await nextPage(item, 0);

    return item.comments;
}


/**
 * 所有日志转换成导出文件
 * @param {Array} items 日志列表
 */
API.Blogs.exportAllListToFiles = async(items) => {
    // 获取用户配置
    let exportType = QZone_Config.Blogs.exportType;
    switch (exportType) {
        case 'HTML':
            await API.Blogs.exportToHtml(items);
            break;
        case 'PDF':
            await API.Blogs.exportToPDF(items);
            break;
        case 'MarkDown':
            await API.Blogs.exportToMarkdown(items);
            break;
        case 'JSON':
            await API.Blogs.exportToJson(items);
            break;
        default:
            console.warn('未支持的导出类型', exportType);
            break;
    }
}

/**
 * 导出日志到HTML文件
 * @param {Array} items 日志列表
 */
API.Blogs.exportToHtml = async(items) => {
    // 进度更新器
    const indicator = new StatusIndicator('Blogs_Export_Other');
    indicator.setIndex('HTML');

    try {

        // 模块文件夹路径
        const moduleFolder = API.Common.getModuleRoot('Blogs');
        // 创建模块文件夹
        await API.Utils.createFolder(moduleFolder + '/json');

        // 基于JSON生成JS
        await API.Common.writeJsonToJs('blogs', items, moduleFolder + '/json/blogs.js');

        // 基于模板生成HTML
        await API.Common.writeHtmlofTpl('blogs', undefined, moduleFolder + "/index.html");

        // 生成日志详情HTML
        await API.Common.writeHtmlofTpl('bloginfo', undefined, moduleFolder + "/info.html");

        // 每篇日志生成单独的HTML
        for (let i = 0; i < items.length; i++) {
            const blog = items[i];
            const orderNum = API.Utils.prefixNumber(i + 1, items.length.toString().length);
            await API.Common.writeHtmlofTpl('bloginfo_static', { blog: blog }, moduleFolder + "/{0}_{1}.html".format(orderNum, API.Utils.filenameValidate(blog.title)));
        }

    } catch (error) {
        console.error('导出私密日记到HTML异常', error);
    }

    // 更新进度信息
    indicator.complete();

    return items;
}


/**
 * 导出日志到HTML文件
 * @param {Array} items 日志列表
 */
API.Blogs.exportToPDF = async(items) => {
    // 进度更新器
    const indicator = new StatusIndicator('Blogs_Export_Other');
    indicator.setIndex('PDF');

    // 每篇日志生成单独的HTML
    for (let i = 0; i < items.length; i++) {
        const blog = items[i];
        const orderNum = API.Utils.prefixNumber(i + 1, items.length.toString().length);
        const doc = new jsPDF();
        doc.setFont('QZoneExport');
        const html = API.Utils.base64ToUtf8(blog.html);
        doc.html($(html)[0], {
            callback: function(doc) {
                doc.save("{0}_{1}.pdf".format(orderNum, API.Utils.filenameValidate(blog.title)));
            },
            x: 10,
            y: 10
        });
    }

    indicator.addSuccess(items);
    // 更新完成信息
    indicator.complete();
    return items;
}

/**
 * 导出日志到MarkDown文件
 * @param {Array} items 日志列表
 */
API.Blogs.exportToMarkdown = async(items) => {
    // 进度更新器
    const indicator = new StatusIndicator('Blogs_Export');
    indicator.setTotal(items.length);

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        // 获取日志MD内容
        const content = await API.Blogs.getMarkdown(item);
        // 写入内容到文件
        // 标签
        const labels = API.Blogs.getBlogLabel(item);
        const date = new Date(item.pubtime * 1000).format('yyyyMMddhhmmss');
        // 序号
        const orderNum = API.Utils.prefixNumber(index + 1, QZone.Blogs.total.toString().length);
        // 文件名
        let filename = API.Utils.filenameValidate(orderNum + "_" + date + "_【" + item.title + "】");
        if (labels && labels.length > 0) {
            filename = API.Utils.filenameValidate(orderNum + "_" + date + "_" + labels.join("_") + "【" + item.title + "】");
        }
        // 文件夹路径
        const categoryFolder = API.Common.getModuleRoot('Blogs') + "/" + item.category;
        // 创建文件夹
        await API.Utils.createFolder(categoryFolder);
        // 日志文件路径
        const filepath = categoryFolder + '/' + filename + ".md";
        await API.Utils.writeText(content, filepath).then(() => {
            // 更新成功信息
            indicator.addSuccess(item);
        }).catch((e) => {
            indicator.addFailed(item);
            console.error('写入日志文件异常', item, e);
        })
    }
    // 更新完成信息
    indicator.complete();
    return items;
}

/**
 * 获取单篇日志的MD内容
 * @param {object} item 日志信息
 */
API.Blogs.getMarkdown = async(item) => {
    const contents = [];
    // 标题
    contents.push("# " + item.title);
    // 日期
    contents.push("> " + API.Utils.formatDate(item.pubtime));
    contents.push('\r\n');
    // 内容
    // 根据HTML获取MD内容
    let markdown = QZone.Common.MD.turndown(API.Utils.base64ToUtf8(item.custom_html));
    contents.push(markdown.replace(/\n/g, "\r\n"));

    // 评论
    contents.push("> 评论({0})".format(item.replynum));
    contents.push('\r\n');

    let comments = item.comments || [];
    for (const comment of comments) {
        // 评论人
        let poster = comment.poster.name || QZone.Common.Target.nickname || '';
        poster = API.Common.formatContent(poster, 'MD');
        poster = API.Common.getUserLink(comment.poster.id, poster, 'MD', true);

        // 评论内容
        let content = API.Common.formatContent(comment.content, 'MD');
        // 替换换行符
        content = content.replace(/\n/g, "");

        // 添加评论内容
        contents.push('* {0}：{1}'.format(poster, content));

        // 评论的回复
        const replies = comment.replies || [];
        for (const rep of replies) {
            // 回复人
            let repPoster = rep.poster.name || QZone.Common.Target.nickname || '';
            repPoster = API.Common.formatContent(repPoster, 'MD');
            repPoster = API.Common.getUserLink(rep.poster.id, repPoster, 'MD', true);

            // 回复内容
            let repContent = API.Common.formatContent(rep.content, 'MD');
            // 替换换行符
            repContent = repContent.replace(/\n/g, "");

            // 添加评论内容
            contents.push('\t* {0}：{1}'.format(repPoster, repContent));
        }
    }
    return contents.join('\r\n');
}

/**
 * 处理日志列表的图片
 * @param {Array} items 日志列表
 */
API.Blogs.handerListImages = async(items) => {
    if (QZone_Config.Blogs.exportType !== 'HTML' || QZone_Config.Blogs.viewType !== '1' || API.Common.isQzoneUrl()) {
        // 非HTMl备份、非摘要模式、QQ空间外链，无需处理列表图片
        return;
    }
    for (const item of items) {
        if (!API.Common.isNewItem(item)) {
            return;
        }
        const images = item.img || [];
        for (const image of images) {
            // 图片地址
            const url = API.Utils.toHttp(image.url);

            // 添加下载任务
            const uid = API.Utils.newSimpleUid(8, 16);
            const suffix = await API.Utils.autoFileSuffix(url);
            image.custom_url = uid + suffix;

            API.Utils.newDownloadTask('Blogs', url, 'Blogs/images', image.custom_url, item);

            // 备份的显示地址
            image.custom_url = 'images/' + image.custom_url;
        }
    }
}

/**
 * 处理日志内容的图片
 * @param {object} item 日志
 * @param {Array} images 图片元素列表
 */
API.Blogs.handerContentImages = async(item, images) => {
    if (!images) {
        // 无图片不处理
        return item;
    }
    // 导出类型
    const exportType = QZone_Config.Blogs.exportType;
    for (let i = 0; i < images.length; i++) {
        const $img = $(images[i]);
        // 处理相对协议
        let url = $img.attr('orgsrc') || $img.attr('src');
        url = API.Utils.toHttp(url);

        // 添加下载任务
        if (!API.Common.isQzoneUrl()) {
            // 非QQ空间外链
            const uid = API.Utils.newSimpleUid(8, 16);
            const suffix = await API.Utils.autoFileSuffix(url);
            const custom_filename = uid + suffix;

            // 添加下载任务
            API.Utils.newDownloadTask('Blogs', url, 'Blogs/images', custom_filename, item);

            // 新的图片离线地址
            url = 'MarkDown' === exportType ? '../images/' + custom_filename : 'images/' + custom_filename;
        }

        // 修改日志中的图片链接
        $img.attr('src', url);
        // 更改图片索引
        $img.attr('data-idx', i);
        // 修改图片样式
        $img.attr('style', "border:0;background-image:url(../Common/images/loading.gif);background-repeat:no-repeat;background-position:center center;")

        // 图片上层的超链接
        const $imageLink = $img.parent('a');

        // 修改图片点击事件
        if ($imageLink && $imageLink.length > 0) {
            // 更改图片地址
            $imageLink.attr('href', url);
            // 画廊查看大图
            $imageLink.addClass('lightgallery');
        } else {
            // 没有超链接的，需要添加超链接，用于生成画廊
            $img.wrap('<a class="lightgallery" href="' + url + '"></a>');
        }
    }
    return item;
}

/**
 * 处理视频信息（简单处理，没仔细研究）
 * @param {object} item 日志
 * @param {Array} embeds 图片元素列表
 */
API.Blogs.handerMedias = async(item, embeds) => {
    if (!embeds) {
        // 无图片不处理
        return item;
    }
    // 导出类型
    const exportType = QZone_Config.Blogs.exportType;
    for (let i = 0; i < embeds.length; i++) {
        const $embed = $(embeds[i]);
        const data_type = $embed.attr('data-type');
        let vid = $embed.attr('data-vid');
        const height = $embed.attr('height') || 'auto';
        const width = $embed.attr('width') || '100%';
        let iframe_url = $embed.attr('src');
        const srcInfo = API.Utils.toParams(iframe_url);
        switch (data_type) {
            case '1':
                // 相册视频
                // MP4地址 
                const mp4_url = $embed.attr('data-mp4');
                if (srcInfo.hasOwnProperty('vurl') || mp4_url) {
                    // 视频下载地址
                    let vurl = mp4_url || decodeURIComponent(API.Utils.toParams(iframe_url).vurl);

                    // 添加下载任务
                    if (!API.Common.isQzoneUrl()) {
                        // 非QQ空间外链
                        const uid = API.Utils.newSimpleUid(8, 16);
                        const suffix = await API.Utils.autoFileSuffix(vurl);
                        const custom_filename = uid + suffix;

                        // 添加下载任务
                        API.Utils.newDownloadTask('Blogs', vurl, 'Blogs/images', custom_filename, item);

                        // 新的图片离线地址
                        vurl = 'MarkDown' === exportType ? '../images/' + custom_filename : 'images/' + custom_filename;
                    }
                    $embed.replaceWith('<video src="{0}" height="auto" width="100%" controls="controls" ></video>'.format(vurl));
                } else {
                    if (!vid) {
                        // 未知数据，不处理
                        console.warn('未知数据，不处理', $embed);
                        return;
                    }
                    // iframe 播放地址
                    iframe_url = 'https://h5.qzone.qq.com/video/index?vid=' + vid;
                    $embed.replaceWith('<iframe src="{0}" height="auto" width="100%" allowfullscreen="true"></iframe>'.format(iframe_url));
                }
                break;
            case '51':
                // 外部视频
                if (!vid) {
                    // 历史数据或特殊数据跳过不处理
                    console.warn('未知数据，不处理', $embed);
                    return;
                }
                iframe_url = API.Videos.getTencentVideoUrl(vid);
                $embed.replaceWith('<iframe src="{0}" height="auto" width="100%" allowfullscreen="true"></iframe>'.format(iframe_url));
                break;
            default:
                // 其他的
                // 默认取src值
                vid = API.Utils.toParams(iframe_url)['vid'];
                if (vid) {
                    // 取到VID，默认当外部视频处理
                    iframe_url = API.Videos.getTencentVideoUrl(vid);
                }
                $embed.replaceWith('<iframe src="{0}" height="auto" width="100%" allowfullscreen="true"></iframe>'.format(iframe_url));
                break;
        }
    }
    return item;
}

/**
 * 导出日志到JSON文件
 * @param {Array} items 日志列表
 */
API.Blogs.exportToJson = async(items) => {
    let indicator = new StatusIndicator('Blogs_Export_Other');
    indicator.setIndex('JSON');
    let json = JSON.stringify(items);
    await API.Utils.writeText(json, API.Common.getModuleRoot('Blogs') + '/blogs.json');
    indicator.complete();
    return items;
}

/**
 * 日志自定义排序（置顶排前，同是置顶最新发表在前，非置顶最新发表在前）
 * @param {Array} items 列表
 */
API.Blogs.sort = (items) => {
    const compare = function(obj1, obj2) {
        const isTop1 = API.Blogs.getBlogLabel(obj1).indexOf('置顶') > -1;
        const isTop2 = API.Blogs.getBlogLabel(obj2).indexOf('置顶') > -1;
        const res = obj1.pubtime > obj2.pubtime ? 1 : -1;
        if (isTop1 !== isTop2) {
            if (isTop1) {
                return -1;
            } else if (isTop2) {
                return 1;
            }
        }
        if (isTop1 && !isTop2) {
            return res;
        } else {
            return -res;
        }
    }
    return items.sort(compare);
}

/**
 * 获取日志赞记录
 * @param {Array} items 日志列表
 */
API.Blogs.getAllLikeList = async(items) => {

    if (!API.Common.isGetLike(QZone_Config.Blogs)) {
        // 不获取赞
        return items;
    }

    // 进度更新器
    const indicator = new StatusIndicator('Blogs_Like');
    indicator.setTotal(items.length);

    // 同时请求数
    const _items = _.chunk(items, 10);

    // 获取点赞列表
    let count = 0;
    end: for (let i = 0; i < _items.length; i++) {
        const list = _items[i];

        let tasks = [];
        for (let j = 0; j < list.length; j++) {

            const item = list[j];
            item.likes = item.likes || [];

            if (!API.Common.isNewItem(item)) {
                // 列表由新到旧，只要遍历到旧项，后续的都是旧的，跳出循环
                await Promise.all(tasks);
                break end;
            }
            indicator.setIndex(++count);
            tasks.push(API.Common.getModulesLikeList(item, QZone_Config.Blogs).then((likes) => {
                // 获取完成
                indicator.addSuccess(item);
            }).catch((e) => {
                console.error("获取日志点赞异常：", item, e);
                indicator.addFailed(item);
            }));

        }

        await Promise.all(tasks);
        // 每一批次完成后暂停半秒
        await API.Utils.sleep(500);
    }

    // 已备份数据跳过不处理
    indicator.setSkip(items.length - count);

    // 完成
    indicator.complete();

    return items;
}


/**
 * 获取单条日志的全部最近访问
 * @param {object} item 说说
 */
API.Blogs.getItemAllVisitorsList = async(item) => {
    // 清空原有的最近访问信息
    item.custom_visitor = {
        viewCount: 0,
        totalNum: 0,
        list: []
    };

    // 说说最近访问配置
    const CONFIG = QZone_Config.Blogs.Visitor;

    const nextPage = async function(item, pageIndex) {
        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Blogs.getVisitors(item.blogid, pageIndex).then(async(data) => {
            data = API.Utils.toJson(data, /^_Callback\(/);
            if (data.code < 0) {
                // 获取异常
                console.warn('获取单条日志的全部最近访问异常：', data);
            }
            data = data.data || {};

            // 合并
            item.custom_visitor.viewCount = data.viewCount || 0;
            item.custom_visitor.totalNum = data.totalNum || 0;
            item.custom_visitor.list = item.custom_visitor.list.concat(data.list || []);

            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.custom_visitor.totalNum, item.custom_visitor.list, arguments.callee, item, nextPageIndex);
        }).catch(async(e) => {
            console.error("获取日志最近访问列表异常，当前页：", pageIndex + 1, item, e);

            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.custom_visitor.totalNum, item.custom_visitor.list, arguments.callee, item, nextPageIndex);
        });
    }

    await nextPage(item, 0);

    return item.custom_visitor;
}

/**
 * 获取日志最近访问
 * @param {Array} items 日志列表
 */
API.Blogs.getAllVisitorList = async(items) => {
    if (!API.Common.isGetVisitor(QZone_Config.Blogs)) {
        // 不获取最近访问
        return items;
    }
    // 进度更新器
    const indicator = new StatusIndicator('Blogs_Visitor');
    indicator.setTotal(items.length);

    // 同时请求数
    const _items = _.chunk(items, 10);

    // 获取最近访问
    let count = 0;
    end: for (let i = 0; i < _items.length; i++) {
        const list = _items[i];
        let tasks = [];
        for (let j = 0; j < list.length; j++) {
            const item = list[j];
            if (!API.Common.isNewItem(item)) {
                // 列表由新到旧，只要遍历到旧项，后续的都是旧的，跳出循环
                await Promise.all(tasks);
                break end;
            }
            indicator.setIndex(++count);
            tasks.push(API.Blogs.getItemAllVisitorsList(item).then((visitor) => {
                // 获取完成
                indicator.addSuccess(item);
            }).catch((e) => {
                console.error("获取日志最近访问异常：", item, e);
                indicator.addFailed(item);
            }));

        }

        await Promise.all(tasks);
        // 每一批次完成后暂停半秒
        await API.Utils.sleep(500);
    }

    // 获取日志阅读数
    await API.Blogs.getAllReadCount(items);

    // 已备份数据跳过不处理
    indicator.setSkip(items.length - count);

    // 完成
    indicator.complete();

    return items;
}

/**
 * 获取日志阅读数
 * @param {Array} items 日志列表
 */
API.Blogs.getAllReadCount = async(items) => {
    try {
        // 同时请求数
        const _items = _.chunk(items, 10);

        // 获取最近访问
        end: for (let i = 0; i < _items.length; i++) {
            const list = _items[i];

            // 日志ID数组
            const blogIds = [];
            for (let j = 0; j < list.length; j++) {
                const item = list[j];
                if (!API.Common.isNewItem(item)) {
                    // 列表由新到旧，只要遍历到旧项，后续的都是旧的，跳出循环
                    break end;
                }
                blogIds.push(item.blogid);
            }

            // 单独获取日志的阅读数
            let data = await API.Blogs.getReadCount(blogIds);
            data = API.Utils.toJson(data, /^_Callback\(/);
            if (data.code < 0) {
                // 获取异常
                console.warn('获取日志阅读数异常：', data);
            }
            data = data.data || {};

            const readList = data.itemList || [];
            const idMaps = API.Utils.groupedByField(readList, "id");
            for (const item of list) {
                if (idMaps.has(item.blogid)) {
                    item.custom_visitor.viewCount = idMaps.get(item.blogid)[0].read || item.custom_visitor.viewCount;
                }
            }
        }
    } catch (error) {
        console.error("获取日志阅读数异常：", error);
    }
    return items;
}