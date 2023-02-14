/**
 * QQ空间相册模块的导出A
 * @author https://lvshuncai.com
 */


/**
 * 导出相册数据
 */
API.Photos.export = async() => {

    // 模块总进度更新器
    const indicator = new StatusIndicator('Photos_Row_Infos');
    indicator.print();

    try {
        // 用户选择的备份相册列表
        const albumList = await API.Photos.initAlbums();

        // 获取相册的评论列表
        await API.Photos.getAllAlbumsComments(albumList);

        // 获取相册赞记录
        await API.Photos.getAlbumsLikeList(albumList);

        // 获取相册最近访问
        await API.Photos.getAllVisitorList(albumList);

        // 获取所有相册的相片列表
        const imagesMapping = await API.Photos.getAllAlbumImageListByListType(albumList);

        // 获取所有相片的详情
        await API.Photos.getAllImagesInfos(albumList);

        // 刷新相片的相册信息
        API.Photos.refreshAllPhotoAlbumInfo(albumList);

        // 获取相片的评论列表
        const images = API.Photos.toImages(imagesMapping);
        await API.Photos.getAllImagesComments(images);

        // 添加点赞Key
        API.Photos.addPhotoUniKey(images);

        // 获取相片赞记录
        await API.Photos.getPhotosLikeList(images);

        // 添加相片下载任务
        await API.Photos.addAlbumsDownloadTasks(albumList);

        // 根据导出类型导出数据    
        await API.Photos.exportAllListToFiles(albumList);

    } catch (error) {
        console.error('相册导出异常', error);
    }

    // 完成
    indicator.complete();
}

/**
 * 转换相片集合
 * @param {Object} imagesMapping 相册与相片的映射关系
 */
API.Photos.toImages = (imagesMapping) => {
    let allImages = [];
    for (let x in imagesMapping) {
        let obj = imagesMapping[x];
        allImages = allImages.concat(obj.Data || []);
    }
    return allImages;
}

/**
 * 获取所有相片的详情
 * @param {Array} albumList 相册列表
 */
API.Photos.getAllImagesInfos = async(albumList) => {
    if (QZone_Config.Photos.Images.listType === 'Detail') {
        // 如果列表类型为详情列表，则无需再额外获取详情
        return;
    }

    if (!QZone_Config.Photos.Images.Info.isGet && !QZone_Config.Photos.Images.isGetVideo) {
        // 无需获取详情 也无需获取视频
        return;
    }

    for (const album of albumList) {

        // 进度更新器
        const indicator = new StatusIndicator('Photos_Images_Info');

        // 开始
        indicator.print();

        // 设置当前相册
        indicator.setIndex(album.name);

        const photos = album.photoList || [];

        // 设置总数
        indicator.setTotal(photos.length);

        // 照片信息
        const picKeyMaps = new Map();
        for (const photo of photos) {
            picKeyMaps.set(API.Photos.getImageKey(photo), photo);
        }

        // 已经获取过详细信息的图片
        const picInfoCache = new Map();

        // 遍历所有的照片信息
        for (const [picKey, photo] of picKeyMaps) {
            // 增量备份判断
            if (!API.Photos.isNewItem(album.id, photo)) {
                // 已备份数据跳过不处理
                indicator.addSkip(photo);
                continue;
            }

            // 是否获取详情，勾选了获取详情时，需要获取，没有勾选获取详情，但是勾选了获取视频时，当相片为视频时，需要获取关联的视频
            const isGetImageInfo = (photo.is_video && QZone_Config.Photos.Images.isGetVideo) || QZone_Config.Photos.Images.Info.isGet;
            if (!isGetImageInfo) {
                // 无需获取详情
                indicator.addSkip(photo);
                continue;
            }

            if (picInfoCache.has(picKey)) {
                // 获取过详情，跳过
                continue;
            }

            // 更新获取进度
            indicator.addDownload(photo);

            await API.Photos.getImageInfo(album.id, picKey).then((data) => {
                // 去掉函数，保留json
                data = API.Utils.toJson(data, /^_Callback\(/);
                if (data.code < 0) {
                    // 获取异常
                    console.warn('获取所有相片的详情异常：', data);
                }
                data = data.data || {};

                // 相片
                const infoPhotos = data.photos || [];

                // 处理获取到的照片详情
                for (const infoPhoto of infoPhotos) {
                    // 首个相片，即当前相片
                    if (!infoPhoto || !infoPhoto.picKey) {
                        console.warn('无法获取到图片详情，将使用列表默认值！', album, photo, infoPhoto);
                        continue;
                    }

                    // 将详情与列表的相片进行匹配
                    const targetPhoto = picKeyMaps.get(infoPhoto.picKey);
                    if (!targetPhoto) {
                        // 没有匹配则跳过，理论上不会没有匹配，触发列表获取异常
                        console.warn('相片详情与列表的相片进行匹配异常！', album, infoPhoto);
                        continue;
                    }

                    // 拷贝覆盖属性到photo
                    // 清空源属性
                    const keys = Object.keys(targetPhoto);
                    for (const key of keys) {
                        delete targetPhoto[key];
                    }
                    Object.assign(targetPhoto, infoPhoto);

                    // 更新获取进度
                    indicator.addSuccess(targetPhoto);

                    // 设置缓存信息
                    picInfoCache.set(API.Photos.getImageKey(targetPhoto), targetPhoto);
                }
            }).catch((error) => {
                console.error('获取相片详情异常', photo, error);
                // 更新获取进度
                indicator.addFailed(photo);
            });

            // 请求一页成功后等待指定秒数后再请求下一页
            const min = QZone_Config.Photos.Images.Info.randomSeconds.min;
            const max = QZone_Config.Photos.Images.Info.randomSeconds.max;
            const seconds = API.Utils.randomSeconds(min, max);

            await API.Utils.sleep(seconds * 1000);
        }

        // 完成
        indicator.complete();
    }
}

/**
 * 刷新所有相片的相册、分类信息
 * @param {Array} albumList 相册
 * @param {Array} photos 相片列表
 */
API.Photos.refreshAllPhotoAlbumInfo = (albumList) => {
    for (const album of albumList) {
        API.Photos.refreshPhotoAlbumInfo(album, album.photoList || []);
    }
}

/**
 * 刷新相片的相册、分类信息
 * @param {Object} album 相册
 * @param {Array} photos 相片列表
 */
API.Photos.refreshPhotoAlbumInfo = (album, photos) => {
    for (const photo of photos) {
        photo.albumId = album.id;
        photo.albumClassId = album.classid;
        photo.albumClassName = album.className || QZone.Photos.Class[album.classid] || '其他';
        // 上传时间处理
        if (!photo.uploadTime && photo.uploadtime) {
            photo.uploadTime = photo.uploadtime
        }
    }
}

/**
 * 获取单页的相册列表
 * @param {integer} pageIndex 指定页的索引
 * @param {StatusIndicator} indicator 状态更新器
 */
API.Photos.getAlbumPageList = async(pageIndex, indicator) => {

    // 状态更新器当前页
    indicator.setIndex(pageIndex + 1);

    // 更新获取中数据
    indicator.addDownload(QZone_Config.Photos.pageSize);

    // 查询相册
    return await API.Photos.getAlbums(pageIndex).then(async(data) => {
        // 去掉函数，保留json
        data = API.Utils.toJson(data, /^shine0_Callback\(/);
        if (data.code < 0) {
            // 获取异常
            console.warn('获取单页的相册列表异常：', data);
        }
        data = data.data || {};

        // 更新总数
        QZone.Photos.Album.total = data.albumsInUser || QZone.Photos.Album.total || 0;
        indicator.setTotal(QZone.Photos.Album.total);

        // 更新相册分类信息
        if (data.classList && data.classList.length > 0) {
            for (const classItem of data.classList) {
                QZone.Photos.Class[classItem.id] = classItem.name;
            }
        }

        let dataList = data.albumList || [];

        //  更新获取成功数据
        indicator.addSuccess(dataList);

        return dataList;
    })
}

/**
 * 获取所有的相册列表
 */
API.Photos.getAllAlbumList = async() => {
    // 进度更新器
    const indicator = new StatusIndicator('Photos');

    // 开始
    indicator.print();

    const CONFIG = QZone_Config.Photos;

    const nextPage = async function(pageIndex, indicator) {
        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Photos.getAlbumPageList(pageIndex, indicator).then(async(dataList) => {

            // 合并数据
            QZone.Photos.Album.Data = API.Utils.unionItems(QZone.Photos.Album.Data, dataList);

            if (!API.Common.isGetNextPage(QZone.Photos.Album.OLD_Data, dataList, CONFIG)) {
                // 不再继续获取下一页
                return QZone.Photos.Album.Data;
            }
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, QZone.Photos.Album.total, QZone.Photos.Album.Data, arguments.callee, nextPageIndex, indicator);

        }).catch(async(e) => {
            console.error("获取相册列表异常，当前页：", pageIndex + 1, e);
            indicator.addFailed(new PageInfo(pageIndex, CONFIG.pageSize));

            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, QZone.Photos.Album.total, QZone.Photos.Album.Data, arguments.callee, nextPageIndex, indicator);
        });
    }

    await nextPage(0, indicator);

    // 更新相册类别
    for (const album of QZone.Photos.Album.Data) {
        album.className = QZone.Photos.Class[album.classid] || '其他';
        album.photoList = album.photoList || [];
    }

    // 完成
    indicator.complete();

    // 重新排序
    API.Photos.sortAlbums(QZone.Photos.Album.Data);

    return QZone.Photos.Album.Data;

}

/**
 * 获取单个相册的指定页相片列表
 * @param {Object} item 相册
 * @param {integer} pageIndex 指定页的索引
 * @param {StatusIndicator} indicator 状态更新器
 */
API.Photos.getAlbumImagePageList = async(item, pageIndex, indicator) => {
    // 显示当前处理相册
    indicator && indicator.setIndex(item.name);

    // 更新获取中数据
    indicator && indicator.addDownload(QZone_Config.Photos.Images.pageSize);

    return await API.Photos.getImages(item.id, pageIndex).then(async(data) => {
        // 去掉函数，保留json
        data = API.Utils.toJson(data, /^shine0_Callback\(/);
        if (data.code < 0) {
            // 获取异常
            console.warn('获取单个相册的指定页相片列表异常：', data);
        }
        data = data.data || {};

        // 更新总数
        QZone.Photos.Images[item.id].total = data.totalInAlbum || QZone.Photos.Images[item.id].total || 0;
        indicator && indicator.setTotal(data.totalInAlbum || 0);

        // 合并相册信息到相册(主要是合并预览图与封面图地址)
        if (data.topic) {
            item.pre = data.topic.pre || item.pre;
            item.url = data.topic.url || item.url;
        }

        // 相片列表
        const dataList = data.photoList || [];

        // 更新获取成功数据
        indicator && indicator.addSuccess(dataList);

        return dataList;
    })
}

/**
 * 获取单个相册的全部相片列表
 * @param {Object} album 相册
 */
API.Photos.getAlbumImageAllList = async(album) => {
    // 获取已备份数据
    const OLD_Data = API.Photos.getPhotosByAlbumId(QZone.Photos.Album.OLD_Data, album.id);
    // 重置单个相册的数据
    QZone.Photos.Images[album.id] = {
        total: 0,
        OLD_Data: OLD_Data,
        Data: []
    };
    // 进度更新器
    const indicator = new StatusIndicator('Photos_Images');
    // 开始
    indicator.print();

    // 相册配置项
    const ALBUM_CONFIG = QZone_Config.Photos
        // 相片配置项
    const PHOTO_CONFIG = ALBUM_CONFIG.Images;

    const nextPage = async function(pageIndex, indicator) {
        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Photos.getAlbumImagePageList(album, pageIndex, indicator).then(async(dataList) => {

            // 设置比较信息
            dataList = API.Common.setCompareFiledInfo(dataList, 'uploadtime', 'uploadTime');

            // 合并数据
            QZone.Photos.Images[album.id].Data = API.Utils.unionItems(QZone.Photos.Images[album.id].Data, dataList);
            if (!API.Common.isGetNextPage(QZone.Photos.Images[album.id].OLD_Data, dataList, ALBUM_CONFIG)) {
                // 不再继续获取下一页
                return QZone.Photos.Images[album.id].Data;
            }

            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, PHOTO_CONFIG, QZone.Photos.Images[album.id].total, QZone.Photos.Images[album.id].Data, arguments.callee, nextPageIndex, indicator);
        }).catch(async(e) => {
            console.error("获取相册列表异常，当前页：", pageIndex + 1, album, e);
            indicator.addFailed(new PageInfo(pageIndex, PHOTO_CONFIG.pageSize));
            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, PHOTO_CONFIG, QZone.Photos.Images[album.id].total, QZone.Photos.Images[album.id].Data, arguments.callee, nextPageIndex, indicator);
        });
    }

    await nextPage(0, indicator) || [];

    if (!API.Photos.isNewAlbum(album.id)) {
        // 合并、过滤数据
        QZone.Photos.Images[album.id].Data = API.Common.unionBackedUpItems(ALBUM_CONFIG, QZone.Photos.Images[album.id].OLD_Data, QZone.Photos.Images[album.id].Data);

        // 上传时间倒序
        QZone.Photos.Images[album.id].Data = API.Utils.sort(QZone.Photos.Images[album.id].Data, ALBUM_CONFIG.IncrementField, true);
    }

    // 完成
    indicator.complete();

    return QZone.Photos.Images[album.id].Data;
}

/**
 * 基于详情列表接口获取单个相册的全部相片列表
 * @param {Object} album 相册
 */
API.Photos.getAlbumImageAllListByDetail = async(album) => {
    // 获取已备份数据
    const OLD_Data = API.Photos.getPhotosByAlbumId(QZone.Photos.Album.OLD_Data, album.id);
    // 重置单个相册的数据
    QZone.Photos.Images[album.id] = {
        total: 0,
        OLD_Data: OLD_Data,
        Data: []
    };
    // 进度更新器
    const indicator = new StatusIndicator('Photos_Images');
    // 开始
    indicator.print();

    // 当前相册
    indicator.setIndex(album.name);

    // 相册配置项
    const ALBUM_CONFIG = QZone_Config.Photos
        // 相片配置项
    const PHOTO_CONFIG = ALBUM_CONFIG.Images;

    // 正在获取
    indicator.addDownload(QZone_Config.Photos.Images.pageSize);

    // 需要先获取相册的第一页的相片列表，再基于第一页的第一个相片获取相片详情列表
    const firstPagePhotos = await API.Photos.getAlbumImagePageList(album, 0) || [];
    if (firstPagePhotos.length === 0) {
        // 如果第一页就获取失败，就当作整个相册没有相片，懒得再处理了
        indicator.complete();
        return [];
    }

    // 下一页
    const nextPage = async function(albumId, picKey, indicator) {
        // 获取相片详情
        await API.Photos.getImageInfo(albumId, picKey).then(async(data) => {
            // 去掉函数，保留json
            data = API.Utils.toJson(data, /^_Callback\(/);
            if (data.code < 0) {
                // 获取异常
                console.warn('获取所有相片的详情异常：', data);
            }
            data = data.data || {};

            // 相片列表
            let dataList = data.photos || [];
            indicator.setTotal(data.picTotal || 0);

            // 设置比较信息
            dataList = API.Common.setCompareFiledInfo(dataList, 'uploadtime', 'uploadTime');

            // 合并数据
            QZone.Photos.Images[albumId].Data = _.unionBy(QZone.Photos.Images[albumId].Data, dataList, API.Photos.getImageKey);

            // 成功数量
            indicator.setSuccess(QZone.Photos.Images[albumId].Data);

            if (!API.Common.isGetNextPage(QZone.Photos.Images[albumId].OLD_Data, dataList, ALBUM_CONFIG) || data.last === 1) {
                // 不再继续获取下一页
                return QZone.Photos.Images[albumId].Data;
            }

            // 不是最后一页，继续备份
            return await nextPage(albumId, API.Photos.getImageKey(_.last(dataList)), indicator) || [];

        }).catch((error) => {
            console.error('获取相片详情异常', picKey, error);
            // 更新获取进度
            indicator.addFailed(picKey);
        });

        // 请求一页成功后等待指定秒数后再请求下一页
        const min = PHOTO_CONFIG.Info.randomSeconds.min;
        const max = PHOTO_CONFIG.Info.randomSeconds.max;
        const seconds = API.Utils.randomSeconds(min, max);

        await API.Utils.sleep(seconds * 1000);
    }

    // 相片Key
    const picKey = API.Photos.getImageKey(firstPagePhotos[0]);
    await nextPage(album.id, picKey, indicator);

    if (!API.Photos.isNewAlbum(album.id)) {
        // 合并、过滤数据
        QZone.Photos.Images[album.id].Data = API.Common.unionBackedUpItems(ALBUM_CONFIG, QZone.Photos.Images[album.id].OLD_Data, QZone.Photos.Images[album.id].Data);

        // 上传时间倒序
        QZone.Photos.Images[album.id].Data = API.Utils.sort(QZone.Photos.Images[album.id].Data, ALBUM_CONFIG.IncrementField, true);
    }

    // 完成
    indicator.complete();

    return QZone.Photos.Images[album.id].Data;
}

/**
 * 获取指定相册的相片列表
 * @param {Array} items 相册列表
 */
API.Photos.getAllAlbumImageList = async(items) => {
    for (const item of items) {
        if (!_.some(QZone.Photos.Album.Select, ['id', item.id])) {
            // 不是用户选中的相册，暂不处理
            console.log('不是用户选中的相册，暂不处理');
            continue;
        }
        if (item.allowAccess === 0) {
            // 没权限的跳过不获取
            console.warn("无权限访问该相册", item);
            continue;
        }
        const photos = await API.Photos.getAlbumImageAllList(item);
        item.photoList = photos || [];
    }
    return QZone.Photos.Images;
}

/**
 * 基于相片详情列表接口获取指定相册的相片列表
 * @param {Array} items 相册列表
 */
API.Photos.getAllAlbumImageListByDetail = async(items) => {
    for (const item of items) {
        if (!_.some(QZone.Photos.Album.Select, ['id', item.id])) {
            // 不是用户选中的相册，暂不处理
            console.log('不是用户选中的相册，暂不处理');
            continue;
        }
        if (item.allowAccess === 0) {
            // 没权限的跳过不获取
            console.warn("无权限访问该相册", item);
            continue;
        }
        const photos = await API.Photos.getAlbumImageAllListByDetail(item);
        item.photoList = photos || [];
    }
    return QZone.Photos.Images;
}


/**
 * 获取指定相册的相片列表
 * @param {Array} items 相册列表
 */
API.Photos.getAllAlbumImageListByListType = async(items) => {
    if (QZone_Config.Photos.Images.listType === 'Detail') {
        // 详情列表
        return await API.Photos.getAllAlbumImageListByDetail(items);
    }
    // 默认列表
    return await API.Photos.getAllAlbumImageList(items);
}


/**
 * 获取单个相册的所有评论
 * @param {Object} item 相册对象
 */
API.Photos.getAlbumAllComments = async(item) => {
    // 清空相册原有的评论
    item.comments = [];

    const CONFIG = QZone_Config.Photos.Comments;

    const nextPage = async function(item, pageIndex) {
        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Photos.getAlbumComments(item.id, pageIndex).then(async(data) => {

            // 去掉函数，保留json
            data = API.Utils.toJson(data, /^_Callback\(/);
            if (data.code < 0) {
                // 获取异常
                console.warn('获取单个相册的所有评论异常：', data);
            }
            data = data.data || {};
            data.comments = data.comments || [];

            // 合并数据
            item.comments = API.Utils.unionItems(item.comments, data.comments);

            if (!API.Common.isGetNextPage(QZone.Photos.Album.OLD_Data, data.comments, CONFIG)) {
                // 不再继续获取下一页
                return item.comments;
            }

            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.comment, item.comments, arguments.callee, item, nextPageIndex);

        }).catch(async(e) => {
            console.error("获取单个相册的评论列表异常：", pageIndex + 1, item, e);
            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.comment, item.comments, arguments.callee, item, nextPageIndex);
        });
    }

    await nextPage(item, 0);
}


/**
 * 获取所有的相册的评论
 * @param {Array} items 相册列表
 */
API.Photos.getAllAlbumsComments = async(items) => {
    // 是否需要获取相册的评论
    if (!QZone_Config.Photos.Comments.isGet || API.Photos.isFile()) {
        return;
    }

    // 进度更新器
    const indicator = new StatusIndicator('Photos_Albums_Comments');
    // 更新总数
    indicator.setTotal(items.length);

    for (let index = 0; index < items.length; index++) {
        const item = items[index];

        // 更新当前位置
        indicator.setIndex(index + 1);

        if (!API.Photos.isNewAlbum(item.id)) {
            // 已备份数据跳过不处理
            indicator.addSkip(item);
            continue;
        }
        if (item.comment === 0) {
            // 没评论时，跳过
            indicator.addSkip(item);
            continue;
        }

        // 获取单条的全部评论
        await API.Photos.getAlbumAllComments(item);

        // 添加成功
        indicator.addSuccess(item);
    }

    // 完成
    indicator.complete();
}

/**
 * 获取单张相片的所有评论
 * @param {Object} item 相片对象
 * @param {StatusIndicator} indicator 进度更新器
 */
API.Photos.getImageAllComments = async(item, indicator) => {
    // 清空相片原有的评论
    item.comments = [];

    const CONFIG = QZone_Config.Photos.Images.Comments;

    // 更新下载中
    indicator.addDownload(item);

    const nextPage = async function(item, pageIndex, indicator) {
        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Photos.getImageComments(item.albumId, item.lloc, pageIndex).then(async(data) => {

            // 去掉函数，保留json
            data = API.Utils.toJson(data, /^_Callback\(/);
            if (data.code < 0) {
                // 获取异常
                console.warn('获取单张相片的所有评论异常：', data);
            }
            data = data.data || {};
            data.comments = data.comments || [];


            // 合并数据
            item.comments = API.Utils.unionItems(item.comments, data.comments);
            indicator.addSuccess(data.comments);

            if (!API.Common.isGetNextPage(QZone.Photos.Album.OLD_Data, data.comments, CONFIG)) {
                // 不再继续获取下一页
                return item.comments;
            }

            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.cmtTotal, item.comments, arguments.callee, item, nextPageIndex, indicator);

        }).catch(async(e) => {
            console.error("获取单张相片的评论列表异常：", pageIndex + 1, item, e);
            indicator.addFailed(new PageInfo(pageIndex, CONFIG.pageSize));
            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.cmtTotal, item.comments, arguments.callee, item, nextPageIndex, indicator);
        });
    }

    await nextPage(item, 0, indicator);
}

/**
 * 获取所有的相片的评论
 * @param {Array} items 相片列表
 */
API.Photos.getAllImagesComments = async(items) => {
    // 是否需要获取相片的评论
    if (!QZone_Config.Photos.Images.Comments.isGet || API.Photos.isFile()) {
        return items;
    }

    // 相片评论进度更新器
    const indicator = new StatusIndicator('Photos_Images_Comments');
    // 更新总数
    indicator.setTotal(items.length);

    for (let index = 0; index < items.length; index++) {
        const item = items[index];

        // 当前位置
        indicator.setIndex(index + 1);

        if (item.cmtTotal === 0) {
            // 没评论时，跳过
            indicator.addSkip(item);
            continue;
        }
        if (!API.Photos.isNewItem(item.albumId, item)) {
            // 已备份数据跳过不处理
            indicator.addSkip(item);
            continue;
        }

        // 获取单张相片的全部评论
        await API.Photos.getImageAllComments(item, indicator);

        // 添加成功
        indicator.addSuccess(item);
    }
    // 完成
    indicator.complete();
    return items;
}


/**
 * 添加所有相册的相片下载任务
 * @param {object} albums 相册列表
 */
API.Photos.addAlbumsDownloadTasks = async(albums) => {
    for (const album of albums) {
        const photos = album.photoList || [];

        // 新备份数据才添加预览图与评论图下载任务
        if (API.Photos.isNewAlbum(album.id)) {

            // 添加相册预览图的下载任务
            await API.Photos.addPreviewDownloadTasks(album, 'Albums/images');

            // 添加评论的图片的下载任务
            await API.Photos.addCommentDownloadTasks(album, 'Albums/images');
        }

        // 添加相片的下载任务
        await API.Photos.addPhotosDownloadTasks(album, photos);
    }
}

/**
 * 添加相册预览图的下载任务
 * @param {object} item 相册或相片
 */
API.Photos.addPreviewDownloadTasks = async(item, dir) => {
    if (API.Common.isQzoneUrl()) {
        // QQ空间外链导出时，不需要添加下载任务，但是需要处理
        return;
    }
    item.custom_url = item.custom_url || item.url || item.pre;
    item.custom_filename = API.Utils.newSimpleUid(8, 16);
    // 预览图直接写死后缀（有权限的默认JPEG，无权限的，根据文件名获取）
    item.custom_filename = item.custom_filename + (API.Utils.getFileSuffixByUrl(item.custom_url) || '.jpeg');
    item.custom_filepath = 'images/' + item.custom_filename;
    // 添加下载任务
    API.Utils.newDownloadTask('Photos', item.custom_url, dir, item.custom_filename, item);
    return item;
}

/**
 * 添加评论的下载任务
 * @param {object} item 相册或相片
 */
API.Photos.addCommentDownloadTasks = async(item, dir) => {
    item.comments = item.comments || [];
    for (let i = 0; i < item.comments.length; i++) {
        const comment = item.comments[i];
        // 获取评论的图片
        let images = comment.pic || [];
        for (let j = 0; j < images.length; j++) {
            const image = images[j];
            image.custom_url = image.o_url || image.hd_url || image.b_url || image.s_url || image.url;
            if (API.Common.isQzoneUrl()) {
                // QQ空间外链导出时，不需要添加下载任务，但是需要处理
                continue;
            }
            image.custom_filename = API.Utils.newSimpleUid(8, 16);
            // 获取图片类型
            let suffix = await API.Utils.autoFileSuffix(image.custom_url);
            image.custom_filename = image.custom_filename + suffix;
            image.custom_filepath = 'images/' + image.custom_filename;
            // 添加下载任务
            API.Utils.newDownloadTask('Photos', image.custom_url, dir, image.custom_filename, item);
        }
    }
    return item;
}

/**
 * 添加单个相册的相片下载任务
 * @param {object} album 相册对象
 * @param {Array} photos 相片列表
 * @param {StatusIndicator} indicator 进度更新器
 */
API.Photos.addPhotosDownloadTasks = async(album, photos) => {

    // 相片评论进度更新器
    const indicator = new StatusIndicator('Photos_Images_Mime');
    // 设置当前位置
    indicator.setIndex(album.name);

    // 设置总数
    indicator.setTotal(photos.length);

    for (let index = 0; index < photos.length; index++) {

        const photo = photos[index];

        if (!API.Photos.isNewItem(album.id, photo)) {
            // 已备份数据跳过不处理
            indicator.addSkip(photo);
            continue;
        }

        // 处理中
        indicator.addDownload(photo);

        // 序号，便于排序
        const orderNumber = API.Utils.prefixNumber(index + 1, photos.length.toString().length);

        // 相册文件夹
        const albumFolder = API.Photos.getAlbumFolderPath(album, QZone.Photos.Album.Data.length);

        // 下载存放的文件夹
        const categoryPath = API.Photos.getFileStructureFolderPath(photo);
        const downloadFolder = categoryPath ? albumFolder + '/' + categoryPath : albumFolder;

        if (API.Common.isQzoneUrl()) {
            // QQ空间外链导出时，不需要添加下载任务，但是需要处理
            // 根据配置的清晰度匹配图片，默认高清
            try {
                photo.custom_url = API.Photos.getDownloadUrl(photo, QZone_Config.Photos.Images.exifType);
            } catch (error) {
                console.error('添加下载任务异常：', error, JSON.stringify(photo));
            }
        } else {
            // 非QQ空间外链导出时，需要添加下载任务
            // 如果相片是视频，需要下载视频

            if (photo.is_video && photo.video_info) {
                // 预览图与视频共用一个文件名
                const filename = API.Photos.getImageFileName(photo, orderNumber);

                // 下载预览图
                // 根据配置的清晰度匹配图片，默认高清
                photo.custom_url = API.Photos.getDownloadUrl(photo, QZone_Config.Photos.Images.exifType);

                // 下载视频预览图
                photo.custom_pre_filename = filename + API.Photos.getPhotoSuffix(photo);
                photo.custom_pre_filepath = albumFolder + '/images/' + photo.custom_pre_filename;
                API.Utils.newDownloadTask('Photos', photo.custom_url, albumFolder + '/images', photo.custom_pre_filename, photo);

                // 下载视频
                photo.custom_filename = filename + '.mp4';
                API.Utils.newDownloadTask('Photos', photo.video_info.video_url, downloadFolder, photo.custom_filename, photo);
                photo.custom_filepath = downloadFolder + '/' + photo.custom_filename;

            } else {
                // 根据配置的清晰度匹配图片，默认高清
                photo.custom_url = API.Photos.getDownloadUrl(photo, QZone_Config.Photos.Images.exifType);

                // 文件名称
                photo.custom_filename = API.Photos.getImageFileName(photo, orderNumber);
                photo.custom_filename = photo.custom_filename + API.Photos.getPhotoSuffix(photo);

                // 添加下载任务
                API.Utils.newDownloadTask('Photos', photo.custom_url, downloadFolder, photo.custom_filename, photo);

                // 文件完整路径
                photo.custom_filepath = downloadFolder + '/' + photo.custom_filename;

                // 添加预览图，默认使用原图
                photo.custom_pre_filepath = photo.custom_filepath;

                // 是否下载预览图
                if (QZone_Config.Photos.Images.isGetPreview) {
                    // 如果需要获取预览图
                    photo.custom_pre_filepath = albumFolder + '/images/' + photo.custom_filename;
                    // 添加下载任务
                    API.Utils.newDownloadTask('Photos', photo.pre, albumFolder + '/images', photo.custom_filename, photo);
                }
            }
        }

        // 处理成功
        indicator.addSuccess(photo);

        if (API.Photos.isFile()) {
            // 如果相片导出类型为文件时，则不处理评论的配图// 评论图片
            continue;
        }

        // 添加评论的下载任务
        await API.Photos.addCommentDownloadTasks(photo, albumFolder + '/images');
    }

    // 完成
    indicator.complete();
    return photos;
}

/**
 * 导出相册与相片
 * @param {Array} albums 相册列表
 */
API.Photos.exportAllListToFiles = async(albums) => {
    // 导出相册
    await API.Photos.exportAlbumsToFiles(albums);
    // 导出相片
    await API.Photos.exportPhotosToFiles(albums);
}

/**
 * 导出相册
 * @param {Array} albums 相册列表
 */
API.Photos.exportAlbumsToFiles = async(albums) => {
    // 获取用户配置
    let exportType = QZone_Config.Photos.exportType;
    switch (exportType) {
        case 'HTML':
            await API.Photos.exportAlbumsToHtml(albums);
            break;
        case 'MarkDown':
            await API.Photos.exportAlbumsToMarkdown(albums);
            break;
        case 'JSON':
            await API.Photos.exportAlbumsToJson(albums);
            break;
        default:
            break;
    }
}

/**
 * 导出相册到HTML文件
 * @param {Array} albums 相册列表
 */
API.Photos.exportAlbumsToHtml = async(albums) => {
    // 进度器
    const indicator = new StatusIndicator('Photos_Export');
    indicator.setIndex('HTML')
    try {
        // 根据类别分组
        const albumsMapping = API.Utils.groupedByField(albums, 'className');

        console.info('生成相册首页HTML文件开始', albumsMapping);
        // 基于模板生成相册首页HTML
        let params = {
            albumsMapping: albumsMapping
        }
        let fileEntry = await API.Common.writeHtmlofTpl('albums', params, API.Common.getModuleRoot('Photos') + "/index.html");
        console.info('生成汇总HTML文件结束', fileEntry, albumsMapping);
    } catch (error) {
        console.error('导出相册到HTML异常', error, albums);
    }
    indicator.complete();
    return albums;
}

/**
 * 导出相册到MD文件
 * @param {Array} albums 相册列表
 */
API.Photos.exportAlbumsToMarkdown = async(albums) => {
    // 进度器
    const indicator = new StatusIndicator('Photos_Export');
    indicator.setIndex('Markdown');

    // 根据类别分组
    const albumsMapping = API.Utils.groupedByField(albums, 'className');
    // 遍历分组
    for (const [className, items] of albumsMapping) {
        let contents = [];
        contents.push('### {0}'.format(className));

        // 获取相册的Markdown内容
        contents.push(API.Photos.getAlbumsMarkdown(items));

        // 创建文件夹
        let categoryName = API.Utils.filenameValidate(className);
        let folderName = API.Common.getModuleRoot('Photos') + '/' + categoryName;
        await API.Utils.createFolder(folderName);

        // 写入Markdown文件
        await API.Utils.writeText(contents.join('\r\n'), folderName + '/' + categoryName + ".md").then((file) => {
            // 更新成功信息
            console.info('导出相册到Markdown文件完成', file, items);
        }).catch((e) => {
            console.error('写入相册MD文件异常', items, e);
        })
    }

    // 完成
    indicator.complete();
    return albums;
}

/**
 * 获取相册的Markdown内容
 * @param {Array} albums 相册列表
 */
API.Photos.getAlbumsMarkdown = (albums) => {
    const contents = [];
    for (const album of albums) {

        // 相册名称与地址
        const albumName = album.name;
        const albumUrl = API.Photos.getAlbumUrl(QZone.Common.Target.uin, album.id);
        contents.push('> ' + API.Utils.getLink(albumUrl, albumName, "MD"));
        contents.push('\r\n');

        // 相册预览图
        let pre = API.Common.isQzoneUrl() ? (album.url || API.Photos.getPhotoPreUrl(album.pre)) : '../' + album.custom_filepath;
        contents.push('>[![{0}]({1})](https://user.qzone.qq.com/{2}/photo/{3}) '.format(albumName, pre, QZone.Common.Target.uin, album.id));
        contents.push('\r\n');
        contents.push('>{0} '.format(album.desc || albumName));
        contents.push('\r\n');

        // 评论
        album.comments = album.comments || [];
        contents.push('> 评论({0})'.format(album.comments.length));
        contents.push('\r\n');

        for (const comment of album.comments) {
            // 评论人
            const poster_name = API.Common.formatContent(comment.poster.name, 'MD');
            const poster_display = API.Common.getUserLink(comment.poster.id, poster_name, "MD");

            // 评论内容
            let content = API.Common.formatContent(comment.content, 'MD');
            contents.push("* {0}：{1}".format(poster_display, content));

            // 评论包含图片
            if (comment.pictotal > 0) {
                let comment_images = comment.pic || [];
                for (const image of comment_images) {
                    let custom_url = image.o_url || image.hd_url || image.b_url || image.s_url || image.url;
                    custom_url = API.Common.isQzoneUrl() ? (image.custom_url || custom_url) : '../' + image.custom_filepath;
                    // 添加评论图片
                    contents.push(API.Utils.getImagesMarkdown(custom_url));
                }
            }
            // 评论的回复
            let replies = comment.replies || [];
            for (const repItem of replies) {

                // 回复人
                let repName = API.Common.formatContent(repItem.poster.name, 'MD');
                const rep_poster_display = API.Common.getUserLink(comment.poster.id, repName, "MD");

                // 回复内容
                let content = API.Common.formatContent(repItem.content, 'MD');
                contents.push("\t* {0}：{1}".format(rep_poster_display, content));

                const repImgs = repItem.pic || [];
                for (const repImg of repImgs) {
                    // 回复包含图片
                    let custom_url = repImg.o_url || repImg.hd_url || repImg.b_url || repImg.s_url || repImg.url;
                    custom_url = API.Common.isQzoneUrl() ? (repImg.custom_url || custom_url) : '../' + repImg.custom_filepath;
                    // 添加回复评论图片
                    contents.push(API.Utils.getImagesMarkdown(custom_url));
                }
            }
        }
        contents.push('---');
    }
    return contents.join('\r\n');
}

/**
 * 导出相册到JSON文件
 * @param {Array} albums 相册列表
 */
API.Photos.exportAlbumsToJson = async(albums) => {
    const indicator = new StatusIndicator('Photos_Export');
    indicator.setIndex('JSON')
    let json = JSON.stringify(albums);
    await API.Utils.writeText(json, API.Common.getModuleRoot('Photos') + '/albums.json').then((fileEntry) => {
        console.info('导出相册JSON文件到FileSystem完成', albums, fileEntry);
    }).catch((error) => {
        console.info('导出相册JSON文件到FileSystem异常', albums, error);
    });
    indicator.complete();
    return albums;
}


/**
 * 导出相片
 * @param {Array} albums 相册列表
 */
API.Photos.exportPhotosToFiles = async(albums) => {
    // 获取用户配置
    let exportType = QZone_Config.Photos.exportType;
    switch (exportType) {
        case 'HTML':
            await API.Photos.exportPhotosToHtml(albums);
            break;
        case 'MarkDown':
            await API.Photos.exportPhotosToMarkdown(albums);
            break;
        case 'JSON':
            await API.Photos.exportPhotosToJson(albums);
            break;
        default:
            break;
    }
}

/**
 * 导出相片到HTML文件
 * @param {Array} albums 相册列表
 */
API.Photos.exportPhotosToHtml = async(albums) => {
    let indicator = new StatusIndicator('Photos_Images_Export_Other');
    indicator.setIndex('HTML');
    try {

        // 模块文件夹路径
        const moduleFolder = API.Common.getModuleRoot('Photos');
        // 创建模块文件夹
        await API.Utils.createFolder(moduleFolder + '/json');

        // 基于JSON生成JS
        await API.Common.writeJsonToJs('albums', albums, moduleFolder + '/json/albums.js');

        // 生成相片列表HTML
        await API.Common.writeHtmlofTpl('photos', null, moduleFolder + "/photos.html");

        for (const album of albums) {
            // 生成静态相册文件
            const name = API.Utils.filenameValidate(album.name);
            await API.Common.writeHtmlofTpl('photos', { album: album, albumId: album.id }, moduleFolder + "/" + name + ".html");
        }

    } catch (error) {
        console.error('导出相片到HTML异常', error, albums);
    }
    // 更新完成信息
    indicator.complete();
    return albums;
}

/**
 * 导出相片到MD文件
 * @param {Array} albums 相册列表
 */
API.Photos.exportPhotosToMarkdown = async(albums) => {
    for (const album of albums) {
        // 相片列表
        const photos = album.photoList || [];

        // 每个相册的进度器
        const indicator = new StatusIndicator('Photos_Images_Export');
        indicator.setIndex(album.name);
        indicator.setTotal(photos.length);
        indicator.addDownload(photos);

        // 相册文件夹
        const folderName = API.Common.getRootFolder() + '/' + API.Photos.getAlbumFolderPath(album, QZone.Photos.Album.Data.length);
        await API.Utils.createFolder(folderName);

        // 生成相片年份的MD文件
        const year_maps = API.Utils.groupedByTime(photos, 'uploadTime', 'year');
        for (const [year, year_photos] of year_maps) {
            let year_content = API.Photos.getPhotosMarkdownContents(year_photos);
            await API.Utils.writeText(year_content, folderName + "/" + year + '.md');
        }

        // 生成相册汇总的MD文件
        const album_content = API.Photos.getPhotosMarkdownContents(photos);
        // 相册名称
        const albumName = API.Utils.filenameValidate(album.name);
        await API.Utils.writeText(album_content, folderName + '/' + albumName + '.md');

        indicator.addSuccess(photos);
        indicator.complete();
    }
    return albums;
}

/**
 * 获取相片的MD内容
 * @param {Array} albums 相片列表
 */
API.Photos.getPhotosMarkdownContents = (photos) => {
    const contents = [];
    for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        // 相片名称
        contents.push('> ' + API.Common.formatContent(photo.name || '', 'MD'));
        contents.push('\r\n');

        // 相片
        const custom_filepath = API.Common.getMediaPath(photo.custom_url || photo.url, photo.custom_filepath, "Photos_MarkDown");
        if (photo.is_video) {
            // 视频
            contents.push('<video height="400" src="{0}" controls="controls" ></video>'.format(custom_filepath));
        } else {
            // 图片
            contents.push(API.Utils.getImagesMarkdown(custom_filepath, photo.name));
        }
        contents.push('\r\n');

        // 相片描述
        contents.push('> ' + API.Common.formatContent(photo.desc || photo.name || '', 'MD'));
        contents.push('\r\n');

        // 相片评论
        contents.push('> 评论({0})'.format(photo.cmtTotal || 0));
        contents.push('\r\n');

        // 评论 TODO 兼容私密评论
        photo.comments = photo.comments || [];
        for (const comment of photo.comments) {
            // 评论人
            const poster_name = API.Common.formatContent(comment.poster.name, 'MD');
            const poster_display = API.Common.getUserLink(comment.poster.id, poster_name, "MD");
            // 评论内容
            let content = API.Common.formatContent(comment.content, 'MD');
            contents.push("* {0}：{1}".format(poster_display, content));

            // 评论包含图片
            const comment_images = comment.pic || [];
            for (const image of comment_images) {
                let custom_url = image.o_url || image.hd_url || image.b_url || image.s_url || image.url;
                custom_url = API.Common.isQzoneUrl() ? (image.custom_url || custom_url) : image.custom_filepath
                    // 添加评论图片
                contents.push(API.Utils.getImagesMarkdown(custom_url));
            }

            // 评论的回复
            const replies = comment.replies || [];
            for (const repItem of replies) {
                // 回复人
                const repName = API.Common.formatContent(repItem.poster.name, 'MD');
                const rep_poster_display = API.Common.getUserLink(comment.poster.id, repName, "MD");
                // 回复内容
                const content = API.Common.formatContent(repItem.content, 'MD');
                contents.push("\t* {0}：{1}".format(rep_poster_display, content));

                const repImgs = repItem.pic || [];
                for (const repImg of repImgs) {
                    // 回复包含图片
                    let custom_url = repImg.o_url || repImg.hd_url || repImg.b_url || repImg.s_url || repImg.url;
                    custom_url = API.Common.isQzoneUrl() ? (repImg.custom_url || custom_url) : repImg.custom_filepath
                        // 添加回复评论图片
                    contents.push(API.Utils.getImagesMarkdown(custom_url));
                }
            }
        }
        contents.push('---');
    }
    return contents.join('\r\n');
}

/**
 * 导出相片到JSON文件
 * @param {Array} albums 相册列表
 */
API.Photos.exportPhotosToJson = async(albums) => {
    // 进度显示器
    const indicator = new StatusIndicator('Photos_Images_Export_Other');

    for (const album of albums) {
        // 相册文件夹
        const folderName = API.Common.getRootFolder() + '/' + API.Photos.getAlbumFolderPath(album, QZone.Photos.Album.Data.length);
        await API.Utils.createFolder(folderName);

        // 相册列表
        const photos = album.photoList || [];

        // 相册名称
        const albumName = API.Utils.filenameValidate(album.name);
        await API.Utils.writeText(JSON.stringify(photos), folderName + '/' + albumName + '.json');
    }

    // 完成
    indicator.complete();
    return albums;
}

/**
 * 导出类型是否为文件夹或文件
 */
API.Photos.isFile = () => {
    return QZone_Config.Photos.exportType == 'Folder' || QZone_Config.Photos.exportType == 'File'
}

/**
 * 根据相册ID获取相册列表中的相册
 * @param {Array} items 相册列表
 * @param {integer} albumId 模板相册ID
 */
API.Photos.getAlbumById = (items, albumId) => {
    items = items || [];
    // 获取指定相册数据
    const albumIndex = items.getIndex(albumId, 'id');
    const album = items[albumIndex];
    return album;
}

/**
 * 根据相册ID获取相册列表中的相片列表
 * @param {Array} items 相册列表
 * @param {integer} albumId 模板相册ID
 */
API.Photos.getPhotosByAlbumId = (items, albumId) => {
    const album = API.Photos.getAlbumById(items, albumId);
    if (!album) {
        return [];
    }
    return album.photoList || [];
}

/**
 * 是否增量条目
 * @param {integer} albumId 相册ID
 */
API.Photos.isNewAlbum = (albumId) => {
    if (!QZone.Photos.Album.OLD_Data || QZone.Photos.Album.OLD_Data.length === 0) {
        // 没有存在已备份数据的，当作新数据处理
        return true;
    }
    // 因为用户可以指定相册备份，不全量相册备份的情况下，不能直接取IncrementTime增量时间判断相片是否需要备份，IncrementTime仅适用全量备份的场景
    const album = API.Photos.getAlbumById(QZone.Photos.Album.OLD_Data, albumId);
    if (!album) {
        return true;
    }
    return API.Common.isNewItem(album);
}

/**
 * 是否增量条目
 * @param {integer} albumId 相册ID
 * @param {Object} photo 相片
 */
API.Photos.isNewItem = (albumId, photo) => {
    // 因为用户可以指定相册备份，不全量相册备份的情况下，不能直接取IncrementTime增量时间判断相片是否需要备份，IncrementTime仅适用全量备份的场景
    const album = API.Photos.getAlbumById(QZone.Photos.Album.OLD_Data, albumId);
    if (!album) {
        return true;
    }
    // 已备份相册，可以直接判断，其实也不严谨，先不处理
    // 存在一种场景有问题（如1号只备份A相册，2号A相册上传了相片，3号只备份B相册，这时IncrementTime已刷成3号，此时备份A相册将无法备份2号上传的相片）
    return API.Common.isNewItem(photo);
}

/**
 * 初始化相册列表
 */
API.Photos.initAlbums = async() => {
    // 备份的相册清单
    const albumList = QZone.Photos.Album.Data || [];
    // 用户挑选的相册清单
    const selects = QZone.Photos.Album.Select || [];
    if (selects.length === 0) {
        // 用户没有选择时，默认获取所有相册列表
        albumList.push(...await API.Photos.getAllAlbumList());
    } else {
        // 如果用户选择了备份指定的相册
        // 合并数据
        albumList.push(...selects);
    }

    // 处理增量相册
    if (!API.Common.isFullBackup(QZone_Config.Photos)) {
        // 已备份相册
        const oldAlbumList = QZone.Photos.Album.OLD_Data || [];

        // 需要拷贝的属性
        const attrs = ['desc', 'createtime', 'modifytime', 'lastuploadtime', 'order', 'total', 'viewtype'];

        // 最新相册中，移除已备份的相册
        _.remove(albumList, newAlbum => {
            // 找到历史备份相册
            const oldIdx = _.findIndex(oldAlbumList, ['id', newAlbum.id]);
            if (oldIdx === -1) {
                return false;
            }
            const oldAlbum = oldAlbumList[oldIdx]
            if (newAlbum.name != oldAlbum.name) {
                // 如果相册改名，则重新备份，因为文件名都是按相册名归类的。
                return false;
            }

            // 拷贝新相册的部分属性到旧相册
            for (const attr of attrs) {
                oldAlbum[attr] = newAlbum[attr]
            }
            return true;
        })

        // 合并
        albumList.push(...oldAlbumList);
    }

    // 重新排序
    API.Photos.sortAlbums(albumList);

    for (const item of albumList) {
        // 添加点赞Key
        item.uniKey = API.Photos.getUniKey(item.id);
    }
    return albumList;
}

/**
 * 获取相册赞记录
 * @param {Array} items 相册列表
 */
API.Photos.getAlbumsLikeList = async(items) => {
    if (!API.Common.isGetLike(QZone_Config.Photos)) {
        // 不获取赞
        return;
    }
    // 进度更新器
    const indicator = new StatusIndicator('Photos_Albums_Like');
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

            if (!API.Photos.isNewAlbum(item.id)) {
                // 列表由新到旧，只要遍历到旧项，后续的都是旧的，跳出循环
                await Promise.all(tasks);
                break end;
            }

            indicator.setIndex(++count);
            tasks.push(API.Common.getModulesLikeList(item, QZone_Config.Photos).then((likes) => {
                // 获取完成
                indicator.addSuccess(item);
            }).catch((e) => {
                console.error("获取相册点赞异常：", item, e);
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
}

/**
 * 获取相片赞记录
 * @param {Array} items 相片列表
 */
API.Photos.getPhotosLikeList = async(items) => {
    if (!API.Common.isGetLike(QZone_Config.Photos)) {
        // 不获取赞
        return items;
    }
    // 进度更新器
    const indicator = new StatusIndicator('Photos_Images_Like');
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

            if (!API.Photos.isNewItem(item.albumId, item)) {
                // 列表由新到旧，只要遍历到旧项，后续的都是旧的，跳出循环
                await Promise.all(tasks);
                break end;
            }

            indicator.setIndex(++count);
            tasks.push(API.Common.getModulesLikeList(item, QZone_Config.Photos).then((likes) => {
                // 获取完成
                indicator.addSuccess(item);
            }).catch((e) => {
                console.error("获取相片点赞异常：", item, e);
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
 * 转换数据
 */
API.Photos.addPhotoUniKey = (photos) => {
    for (const photo of photos) {
        // 添加点赞Key
        photo.uniKey = API.Photos.getPhotoUniKey(photo);
    }
}

/**
 * 获取单条全部最近访问
 * @param {object} item 说说
 */
API.Photos.getItemAllVisitorsList = async(item) => {
    // 清空原有的最近访问信息
    item.custom_visitor = {
        viewCount: 0,
        totalNum: 0,
        list: []
    };

    // 最近访问配置
    const CONFIG = QZone_Config.Photos.Visitor;

    const nextPage = async function(item, pageIndex) {
        // 下一页索引
        const nextPageIndex = pageIndex + 1;

        return await API.Photos.getVisitors(item.id, pageIndex).then(async(data) => {
            data = API.Utils.toJson(data, /^_Callback\(/);
            if (data.code < 0) {
                // 获取异常
                console.warn('获取单条全部最近访问异常：', data);
            }
            data = data.data || {};

            // 合并
            item.custom_visitor.viewCount = data.viewCount || 0;
            item.custom_visitor.totalNum = data.totalNum || 0;
            item.custom_visitor.list = item.custom_visitor.list.concat(data.list || []);

            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.custom_visitor.totalNum, item.custom_visitor.list, arguments.callee, item, nextPageIndex);
        }).catch(async(e) => {
            console.error("获取说说最近访问列表异常，当前页：", pageIndex + 1, item, e);

            // 当前页失败后，跳过继续请求下一页
            // 递归获取下一页
            return await API.Common.callNextPage(nextPageIndex, CONFIG, item.custom_visitor.totalNum, item.custom_visitor.list, arguments.callee, item, nextPageIndex);
        });
    }

    await nextPage(item, 0);

    return item.custom_visitor;
}

/**
 * 获取最近访问
 * @param {Array} items 说说列表
 */
API.Photos.getAllVisitorList = async(items) => {
    if (!API.Common.isGetVisitor(QZone_Config.Photos)) {
        // 不获取最近访问
        return items;
    }
    // 进度更新器
    const indicator = new StatusIndicator('Photos_Albums_Visitor');
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
            if (!API.Photos.isNewAlbum(item.id)) {
                // 列表由新到旧，只要遍历到旧项，后续的都是旧的，跳出循环
                await Promise.all(tasks);
                break end;
            }
            indicator.setIndex(++count);
            tasks.push(API.Photos.getItemAllVisitorsList(item).then((visitor) => {
                // 获取完成
                indicator.addSuccess(item);
            }).catch((e) => {
                console.error("获取相册最近访问异常：", item, e);
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
 * 获取相册的文件夹
 * @param {Object} album 相册
 * @param {Object} total 相册数
 */
API.Photos.getAlbumFolderPath = (album, total) => {

    // 相册分类
    album.className = album.className || QZone.Photos.Class[album.classid] || '其他';
    const albumClass = API.Utils.filenameValidate(album.className);
    // 相册名称
    let albumName = API.Utils.filenameValidate(album.name);

    if (QZone_Config.Photos.RenameType === 'Sort') {
        // 使用序号命名方式
        const orderNumber = API.Utils.prefixNumber(album.order + 1, total.toString().length);
        albumName = orderNumber + '_' + albumName;
    }

    // 相册文件夹
    return 'Albums/' + albumClass + '/' + albumName;
}

/**
 * 重新排序
 * @param {Array} albums 相册列表
 */
API.Photos.sortAlbums = albums => {

    switch (QZone_Config.Photos.SortType) {
        case '0':
            // 最新创建在后
            API.Utils.sort(albums, 'createtime', false);
            break;
        case '1':
            // 最新创建在前
            API.Utils.sort(albums, 'createtime', true);
            break;
        case '4':
            // 最新上传在前
            API.Utils.sort(albums, 'lastuploadtime', true);
            break;
        default:
            // 自定义排序，也就是按序号排序
            API.Utils.sort(albums, 'order', false);
            break;
    }

    // 分类不支持排序，按空间默认顺序
    API.Utils.sort(albums, 'classid', false);

    // 根据相册索引位置，重新更新相册的排序号，避免相册order字段为0
    API.Photos.resetAlbumOrderNumber(albums);
}

/**
 * 重置相册排序号
 * @param {Array} albums 相册列表
 */
API.Photos.resetAlbumOrderNumber = albums => {
    for (let idx = 0; idx < albums.length; idx++) {
        const album = albums[idx];
        album.order = idx;
    }
}

/**
 * 获取相片名称
 * @param {Object} photo 相片
 * @param {String} prefix 前缀
 * @returns 
 */
API.Photos.getImageFileName = (photo, prefix) => {
    // 固定
    const fileNames = [API.Utils.filenameValidate(prefix + '_' + photo.name)];

    // 上传时间
    const uploadTime = (photo.uploadtime || photo.uploadTime) && API.Utils.parseDate(photo.uploadtime || photo.uploadTime).getTime();
    // 上传地点
    const uploadLbs = photo.lbs && photo.lbs.idname && photo.lbs;

    // 拍摄时间
    const shootTime = (photo.rawshoottime || photo.shootTime) && API.Utils.parseDate(photo.rawshoottime || photo.shootTime).getTime();
    // 拍摄地点
    const shootGeo = photo.shootGeo && photo.shootGeo.idname && photo.shootGeo;

    if (QZone_Config.Photos.Images.RenameType === 'Default') {
        // 序号_相片名_随机码
        fileNames.push(API.Utils.newSimpleUid(8, 16));
    } else if (QZone_Config.Photos.Images.RenameType === 'Time') {
        // 序号_相片名_拍摄/上传时间
        fileNames.push(API.Utils.formatDate((shootTime || uploadTime) / 1000, 'yyyyMMdd_hhmmss'));
    } else if (QZone_Config.Photos.Images.RenameType === 'Time_Lbs1') {
        // 序号_相片名_拍摄/上传时间_拍摄/上传地点
        fileNames.push(API.Utils.formatDate((shootTime || uploadTime) / 1000, 'yyyyMMdd_hhmmss'));
        let customLbs = shootGeo || uploadLbs || undefined;
        if (customLbs) {
            fileNames.push(customLbs.idname || customLbs.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'Time_Lbs2') {
        // 序号_相片名_上传/拍摄时间_上传/拍摄地点
        fileNames.push(API.Utils.formatDate((shootTime || uploadTime) / 1000, 'yyyyMMdd_hhmmss'));
        let customLbs = uploadLbs || shootGeo || undefined;
        if (customLbs) {
            fileNames.push(customLbs.idname || customLbs.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'ALL') {
        // 序号_相片名_上传时间_上传地点_拍摄时间_拍摄地点/上传地点
        if (uploadTime) {
            fileNames.push(API.Utils.formatDate(uploadTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        if (uploadLbs) {
            fileNames.push(uploadLbs.idname || uploadLbs.name);
        }
        if (shootTime) {
            fileNames.push(API.Utils.formatDate(shootTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        if (shootGeo) {
            fileNames.push(shootGeo.idname || shootGeo.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'UploadTime') {
        // 序号_相片名_上传时间
        fileNames.push(API.Utils.formatDate(uploadTime / 1000, 'yyyyMMdd_hhmmss'));
    } else if (QZone_Config.Photos.Images.RenameType === 'ShootTime') {
        // 序号_相片名_拍摄时间
        fileNames.push(API.Utils.formatDate(shootTime / 1000, 'yyyyMMdd_hhmmss'));
    } else if (QZone_Config.Photos.Images.RenameType === 'ShootTime_ShootLbs') {
        // 序号_相片名_拍摄时间_拍摄地点
        if (shootTime) {
            fileNames.push(API.Utils.formatDate(shootTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        if (shootGeo) {
            fileNames.push(shootGeo.idname || shootGeo.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'ShootTime_Lbs1') {
        // 序号_相片名_拍摄时间_拍摄/上传地点
        if (shootTime) {
            fileNames.push(API.Utils.formatDate(shootTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        let customLbs = shootGeo || uploadLbs || undefined;
        if (customLbs) {
            fileNames.push(customLbs.idname || customLbs.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'ShootTime_Lbs2') {
        // 序号_相片名_拍摄时间_上传/拍摄地点
        if (shootTime) {
            fileNames.push(API.Utils.formatDate(shootTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        let customLbs = uploadLbs || shootGeo || undefined;
        if (customLbs) {
            fileNames.push(customLbs.idname || customLbs.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'UploadTime_UploadLbs') {
        // 序号_相片名_上传时间_上传地点
        if (uploadTime) {
            fileNames.push(API.Utils.formatDate(uploadTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        if (uploadLbs) {
            fileNames.push(uploadLbs.idname || uploadLbs.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'UploadTime_Lbs1') {
        // 序号_相片名_上传时间_上传/拍摄地点
        if (uploadTime) {
            fileNames.push(API.Utils.formatDate(uploadTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        let customLbs = uploadLbs || shootGeo || undefined;
        if (customLbs) {
            fileNames.push(customLbs.idname || customLbs.name);
        }
    } else if (QZone_Config.Photos.Images.RenameType === 'UploadTime_Lbs2') {
        // 序号_相片名_上传时间_拍摄/上传地点
        if (uploadTime) {
            fileNames.push(API.Utils.formatDate(uploadTime / 1000, 'yyyyMMdd_hhmmss'));
        }
        let customLbs = shootGeo || uploadLbs || undefined;
        if (customLbs) {
            fileNames.push(customLbs.idname || customLbs.name);
        }
    }
    photo.custom_filename = fileNames.join('_');
    return photo.custom_filename;
}