(function() {

    //turn to inline mode BootstrapTable行内编辑
    $.fn.editable.defaults.mode = 'inline';

    $(window.location.hash).tab('show');

    // 初始化提示
    $('[data-toggle="tooltip"]').tooltip({
        placement: 'auto',
        container: 'body',
        boundary: 'window'
    })

    // 屏蔽词管理点击事件
    $('#managerKeywords').click(function() {
        $('#managerKeywordsModal').modal('show');
    })

    // 添加默认屏蔽词
    $('#defaultFilterKeyword').click(function() {
        $('#filterKeywords').val(Default_Config.Messages.FilterKeyWords.join('\n'));
    })

    // 添加屏蔽词
    $('#addFilterKeyword').click(function() {
        // 添加的值
        const addValue = $('#filterKeyword').val();
        if (!addValue) {
            return;
        }
        // 现在的值
        let filterKeywordValues = $('#filterKeywords').val();
        if (!filterKeywordValues) {
            filterKeywordValues = [];
        } else {
            filterKeywordValues = filterKeywordValues.split('\n');
        }
        filterKeywordValues.unshift(addValue);
        $('#filterKeywords').val(filterKeywordValues.join('\n'));
    })

    // 屏蔽开关监听事件
    $('#message_is_filter').change(function() {
        if (this.checked) {
            $('.managerKeywordsDiv').show();
            return;
        }
        $('.managerKeywordsDiv').hide();
    })

    // 分享来源管理
    $('#managerShareSource').click(function() {
        // 初始化表格
        let tableOptions = {
            undefinedText: '',
            toggle: 'shareSourceTable',
            locale: 'zh-CN',
            height: '500',
            resizable: true,
            columns: [{
                field: 'name',
                title: '显示名称',
                align: 'left',
                sortable: true,
                formatter: (value, row, index, field) => {
                    return '<a href="#" data-type="text" data-title="请输入名称" data-name="name" data-pk="' + index + '">' + value + '</a>';
                }
            }, {
                field: 'regulars',
                title: '匹配规则',
                align: 'left',
                formatter: (value, row, index, field) => {
                    return '<a href="#" data-type="text" data-title="请输入规则" data-name="regulars" data-pk="' + index + '">' + value + '</a>';
                }
            }, {
                field: 'action',
                title: '操作',
                align: 'left',
                events: {
                    'click .addRow': function(e, value, row, index) {
                        $("#shareSourceTable").bootstrapTable('insertRow', {
                            index: index + 1,
                            row: {
                                name: '',
                                regulars: ''
                            }
                        });
                    },
                    'click .delRow': function(e, value, row, index) {
                        const $table = $("#shareSourceTable");
                        $table.bootstrapTable('remove', { field: '$index', values: [index] })
                    }
                },
                formatter: (value, row, index, field) => {
                    return [
                        '<a class="addRow" href="javascript:void(0)" title="添加行">',
                        '<i class="fa fa-plus"></i>',
                        '</a>  ',
                        '<a class="delRow ml-3" href="javascript:void(0)" title="移除行">',
                        '<i class="fa fa-trash"></i>',
                        '</a>'
                    ].join('')
                }
            }],
            data: API.Utils.sort(QZone_Config.Shares.SourceType, 'name'),
            onResetView: function(arg1, arg2) {

                // 初始化规则编辑
                $('a[data-name="regulars"]').editable({
                    emptytext: "请输入规则",
                    success: function(response, newValue) {
                        // 不知道为什么还要自己更新，可能是用法不对，不纠结了
                        const index = $(this).attr('data-pk');
                        $("#shareSourceTable").bootstrapTable('updateCell', { index: index, field: 'regulars', value: newValue });
                    }
                });

                // 初始化名称编辑
                $('a[data-name="name"]').editable({
                    emptytext: "请输入名称",
                    success: function(response, newValue) {
                        // 不知道为什么还要自己更新，可能是用法不对，不纠结了
                        const index = $(this).attr('data-pk');
                        $("#shareSourceTable").bootstrapTable('updateCell', { index: index, field: 'name', value: newValue });
                    }
                });
            }
        };

        const $shareSourceTable = $("#shareSourceTable");

        // 初始化表格
        $shareSourceTable.bootstrapTable(tableOptions);

        $('#managerShareSourceModal').modal('show');

        $('#saveShareSource').on('click', function(event) {
            QZone_Config.Shares.SourceType = $('#shareSourceTable').bootstrapTable('getData');
        })
    });

    // 提示信息
    const tips = (message) => {
        $('.toast-body').html(message);
        $(".toast").toast('show');
    }

    // 初始化日期选择控件
    $('.increment_time').datetimepicker({
        locale: 'zh-cn',
        defaultDate: Default_IncrementTime, // QQ空间正式发行日期？
        minDate: "2005-04-01 00:00:00", // QQ空间内测发行日期？
        format: 'YYYY-MM-DD HH:mm:ss',
        toolbarPlacement: 'top',
        keepOpen: true,
        sideBySide: true,
        buttons: {
            showToday: true,
            showClear: true,
            showClose: true
        },
        tooltips: {
            today: '今天',
            clear: '清除选择',
            close: '关闭',
            selectMonth: '选择月份',
            prevMonth: '上一月',
            nextMonth: '下一月',
            selectYear: '选择年份',
            prevYear: '上一年',
            nextYear: '下一年',
            incrementHour: '增一小时',
            pickHour: '选择小时',
            decrementHour: '减一小时',
            incrementMinute: '增一分钟',
            pickMinute: '选择分钟',
            decrementMinute: '减一分钟',
            pickSecond: "选择秒钟",
            incrementSecond: "增一秒钟",
            decrementSecond: "减一秒钟",
            selectTime: '选择时间',
            selectDate: '选择日期'
        },
        icons: {
            clear: 'fa fa-trash-o'
        }
    })

    // 增量类型选择事件
    $(".increment_type").change(function() {
        const $this = $(this);
        const value = $this.val();
        const target_module = QZone_Config[$this.attr("data-module")];
        const $increment_time = $($this.attr("data-time"));
        const $increment_time_row = $($this.attr("data-time-row"));
        switch (value) {
            case 'Full':
                // 全量备份
                $increment_time_row.hide();
                $increment_time.val(Default_IncrementTime);
                break;
            case 'LastTime':
                // 上次备份
                $increment_time_row.hide();
                break;
            case 'Custom':
                // 自定义
                $increment_time_row.show();
                $increment_time.val(target_module.IncrementTime);
                break;
            default:
                break;
        }
    })

    // 监听个人中心菜单点击事件
    $('#v-pills-tab a').on('click', function(e) {
        e.preventDefault();
        window.location.hash = "#" + this.id;
    })

    // 监听配置Tab点击事件
    $('#nav-tab a').on('click', function(e) {
        e.preventDefault();
        window.location.hash = "#" + this.id;
    });

    // 监听下载工具选择事件
    $('#common_download_type').change(function() {
        let value = $(this).val();
        const $task_count_row = $('#common_thunder_task_count_row');
        const $task_sleep_row = $('#common_thunder_task_sleep_row');
        const $download_status_row = $('#common_download_status_row');
        const $file_suffix_row = $('#common_file_suffix_row');
        const $suffix_timeout_row = $('#common_file_suffix_timeout_row');
        const $download_thread_row = $('#common_download_thread_row');
        const $download_sleep_row = $('#common_download_sleep_row');
        // Aria2
        const $common_aria2_rpc_row = $('#common_aria2_rpc_row');
        const $common_aria2_token_row = $('#common_aria2_token_row');

        // 提示信息
        const $download_type_help = $('#common_download_type_help');
        const $common_refererUrls = $('#common_refererUrls_row');
        switch (value) {
            case 'File':
                $task_count_row.hide();
                $task_sleep_row.hide();
                $download_status_row.hide();
                // 隐藏Aria2配置
                $common_aria2_rpc_row.hide();
                $common_aria2_token_row.hide();

                $file_suffix_row.show();
                $suffix_timeout_row.show();
                $download_thread_row.show();
                $download_sleep_row.show();
                $common_refererUrls.show();

                $download_type_help.html('助手内部目前<span style="color:red">暂不支持数据容量大于2G的备份</span>，2G内建议使用助手内部下载，超2G的建议使用其他方式下载');
                break;
            case 'Aria2':
                // 其他选项隐藏
                $task_count_row.hide();
                $task_sleep_row.hide();
                $download_status_row.hide();
                $common_refererUrls.hide();

                // 显示Aria2配置
                $download_thread_row.show();
                $download_sleep_row.show();
                $common_aria2_rpc_row.show();
                $common_aria2_token_row.show();
                $file_suffix_row.show();
                $suffix_timeout_row.show();

                $download_type_help.html('老司机可用Aria2，小白建议用Motrix，请确保Aria2/Motrix服务处于启动中！');
                break;
            case 'Thunder':
                $download_status_row.hide();
                // 隐藏Aria2配置
                $common_aria2_rpc_row.hide();
                $common_aria2_token_row.hide();
                $common_refererUrls.hide();
                $download_sleep_row.hide();

                $task_count_row.show();
                $task_sleep_row.show();
                $file_suffix_row.show();
                $suffix_timeout_row.show();
                $download_thread_row.show();

                $download_type_help.html('正版的<span class="text-danger">Windows版迅雷10+</span>以上版本测试通过，，建议先启动迅雷，若无法正常唤醒，可切换迅雷（剪切板唤醒）或Aria2等');
                break;
            case 'Thunder_Clipboard':
                $download_status_row.hide();
                // 隐藏Aria2配置
                $common_aria2_rpc_row.hide();
                $common_aria2_token_row.hide();
                $common_refererUrls.hide();
                $download_sleep_row.hide();

                $task_count_row.show();
                $task_sleep_row.show();
                $file_suffix_row.show();
                $suffix_timeout_row.show();
                $download_thread_row.show();

                $download_type_help.html('正版的<span class="text-danger">Windows版迅雷10+</span>以上版本测试通过，需要<span class="text-danger">先启动迅雷</span>，并<span class="text-danger">打开迅雷设置中的接管剪切板开关</span>');
                break;
            case 'Thunder_Link':
                $download_status_row.hide();
                // 隐藏Aria2配置
                $common_aria2_rpc_row.hide();
                $common_aria2_token_row.hide();
                $common_refererUrls.hide();

                $task_count_row.show();
                $task_sleep_row.hide();
                $file_suffix_row.show();
                $suffix_timeout_row.show();
                $download_thread_row.show();
                $download_sleep_row.hide();

                $download_type_help.html('<span class="text-danger">打开迅雷设置中的接管剪切板开关</span>，然后复制ZIP包中【<span class="text-danger">迅雷下载链接.txt</span>】中的全部文字内容自动新建下载任务');
                break;
            case 'Browser':
                $task_count_row.hide();
                $task_sleep_row.hide();
                // 隐藏Aria2配置
                $common_aria2_rpc_row.hide();
                $common_aria2_token_row.hide();

                $download_status_row.show();
                $file_suffix_row.show();
                $suffix_timeout_row.show();
                $download_thread_row.show();
                $download_sleep_row.show();
                $common_refererUrls.show();

                $download_type_help.html('使用浏览器下载，请确保已关闭浏览器设置中的<span style="color:red">【下载前询问每个文件的保存位置】</span>选项，否则浏览器将会一直弹窗提示保存文件');
                break;
            case 'QZone':
                $task_count_row.hide();
                $task_sleep_row.hide();
                $file_suffix_row.hide();
                $suffix_timeout_row.hide();
                $download_thread_row.hide();
                $download_sleep_row.hide();
                $common_refererUrls.hide();

                // 隐藏Aria2配置
                $common_aria2_rpc_row.hide();
                $common_aria2_token_row.hide();

                $download_type_help.html('不下载图片，直接使用QQ空间的图片地址，<span style="color:red">不推荐使用，可能会存在图片过期、禁止访问等问题</span>');
                break;
            default:
                break;
        }
    })

    // 说说备份类型改变事件
    $('#messages_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'HTML':
                $('#messages_that_year_today').parents('.row').show();
                $('#messages_full_show').parents('.row').show();
                $('#message_other_options').show();
                break;
            case 'MarkDown':
                $('#messages_that_year_today').parents('.row').hide();
                $('#messages_full_show').parents('.row').hide();
                $('#message_other_options').hide();
                break;
            default:
                $('#messages_that_year_today').parents('.row').hide();
                $('#messages_full_show').parents('.row').hide();
                $('#message_other_options').show();
                break;
        }
    })

    // 监听日志备份类型选择事件
    $('#blogs_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'HTML':
                $('#blogs_showType').parents('.row').show();
                $('#blogs_viewType').parents('.row').show();
                break;
            case 'MarkDown':
                $('#blogs_showType').parents('.row').hide();
                $('#blogs_viewType').parents('.row').hide();
                $('#blogs_other_options').hide();
                break;
            default:
                $('#blogs_showType').parents('.row').hide();
                $('#blogs_viewType').parents('.row').hide();
                break;
        }
    })

    // 监听日志展示方式选择事件
    $('#blogs_showType').change(function() {
        switch (this.value) {
            case '1':
                $('#blogs_viewType').parents('.row').show();
                break;
            default:
                $('#blogs_viewType').parents('.row').hide();
                break;
        }
    })

    // 监听日记备份类型选择事件
    $('#diaries_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'HTML':
                $('#diaries_showType').parents('.row').show();
                $('#diaries_other_options').show();
                break;
            case 'MarkDown':
                $('#diaries_showType').parents('.row').hide();
                $('#diaries_other_options').hide();
                break;
            default:
                $('#diaries_showType').parents('.row').hide();
                $('#diaries_other_options').show();
                break;
        }
    })

    // 监听相册备份类型选择事件
    $('#photos_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'File':
                // 隐藏相册评论模块
                $('#photos_albums_comments_panel').hide();
                // 隐藏相片评论模块
                $('#photos_images_comments_panel').hide();
                // 隐藏相片预览图
                $('#photos_images_preview').hide();
                // 隐藏相片点赞模块
                $('#photos_others_panel').hide();
                break;
            case 'MarkDown':
                // 显示相片评论模块
                $('#photos_albums_comments_panel').show();
                // 显示相片评论模块
                $('#photos_images_comments_panel').show();
                // 隐藏相片预览图
                $('#photos_images_preview').show();
                // 显示相片点赞模块
                $('#photos_others_panel').hide();
                // 显示相片清晰度
                $('#photos_exifType_panel').show();
                break;
            default:
                // 显示相片评论模块
                $('#photos_albums_comments_panel').show();
                // 显示相片评论模块
                $('#photos_images_comments_panel').show();
                // 隐藏相片预览图
                $('#photos_images_preview').show();
                // 显示相片点赞模块
                $('#photos_others_panel').show();
                // 显示相片清晰度
                $('#photos_exifType_panel').show();
                break;
        }
    })

    // 监听相片列表类型更改事件
    $('#photos_images_list_type').change(function() {
        switch (this.value) {
            case 'Detail':
                $('#photos_images_cost_min').parents('.row').hide();
                $('#photos_images_limit').parents('.row').hide();
                $("#photos_isGetDetail").prop("checked", true).change();
                $('#photos_isGetDetail').attr('disabled', true);
                $('#photos_images_video').hide();
                break;
            default:
                $('#photos_images_cost_min').parents('.row').show();
                $('#photos_images_limit').parents('.row').show();
                $("#photos_isGetDetail").prop("checked", false).change();
                $('#photos_isGetDetail').attr('disabled', false);
                $('#photos_images_video').show();
                break;
        }
    })

    // 监听相片详情更改事件
    $('#photos_isGetDetail').change(function() {
        let isChecked = $(this).prop("checked");
        // 相片列表类型
        const listType = $('#photos_images_list_type').val();
        if (listType === 'Detail') {
            $('#photos_images_video').hide();
            return;
        }
        if (isChecked === false) {
            $('#photos_images_video').show();
        } else {
            $('#photos_images_video').hide();
        }
    })

    // 监听视频备份类型选择事件
    $('#videos_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'File':
            case 'Link':
                // 隐藏视频评论模块
                $('#videos_comments_panel').hide();
                // 隐藏视频点赞模块
                $('#videos_others_panel').hide();
                break;
            case 'MarkDown':
                // 显示视频评论模块
                $('#videos_comments_panel').show();
                // 隐藏视频点赞模块
                $('#videos_others_panel').hide();
                break;
            default:
                // 显示视频评论模块
                $('#videos_comments_panel').show();
                // 隐藏视频点赞模块
                $('#videos_others_panel').show();
                break;
        }
    })

    // 监听留言备份类型选择事件
    $('#boards_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'HTML':
                $('#boards_that_year_today').parents('.row').show();
                break;
            default:
                $('#boards_that_year_today').parents('.row').hide();
                break;
        }
    })

    // 监听好友备份类型选择事件
    $('#friends_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'HTML':
                $('#friends_showType').parents('.row').show();
                break;
            default:
                $('#friends_showType').parents('.row').hide();
                break;
        }
    })

    // 监听分享备份类型选择事件
    $('#shares_exportFormat').change(function() {
        let value = $(this).val();
        switch (value) {
            case 'HTML':
                $('#shares_that_year_today').parents('.row').show();
                $('#shares_other_options').show();
                break;
            case 'JSON':
                $('#shares_that_year_today').parents('.row').hide();
                $('#shares_other_options').show();
                break;
            default:
                $('#shares_that_year_today').parents('.row').hide();
                $('#shares_other_options').hide();
                break;
        }
    })

    /**
     * 渲染显示值到表单
     * @param {string} options 模块配置项
     * @param {string} fieldName 表单元素名称，必须与配置属性名称一致
     */
    const renderValueToDom = (options, fieldName) => {
        if (!fieldName) {
            return;
        }
        for (const module in options) {
            if (!Object.hasOwnProperty.call(options, module)) {
                continue;
            }
            const emoduleCfg = options[module];
            if (!emoduleCfg.hasOwnProperty(fieldName)) {
                continue;
            }
            const $targetField = $('input[data-module="' + module + '"][name="' + fieldName + '"],select[data-module="' + module + '"][name="' + fieldName + '"]');
            if ($targetField.attr('type') === 'checkbox') {
                $targetField.prop("checked", emoduleCfg[fieldName]).change();
            } else {
                $targetField.val(emoduleCfg[fieldName]);
            }
        }
    }

    // 监听类型识别开关改变事件
    $('#common_file_suffix').change(function() {
        let downloadType = $('#common_download_type').val();
        let suffix_timeout = $('#common_file_suffix_timeout')[0].parentNode.parentNode;
        let isChecked = $(this).prop("checked");
        if (isChecked && 'QZone' !== downloadType) {
            $(suffix_timeout).show();
        } else {
            $(suffix_timeout).hide();
        }
    })

    let loadOptions = (options) => {

        // 说说模块赋值
        $("#messages_exportFormat").val(options.Messages.exportType).change();
        $("#messages_increment_type").val(options.Messages.IncrementType).change();
        $("#messages_increment_time").val(options.Messages.IncrementTime);
        $("#messages_list_cost_min").val(options.Messages.randomSeconds.min);
        $("#messages_list_cost_max").val(options.Messages.randomSeconds.max);
        $("#messages_list_limit").val(options.Messages.pageSize);
        $("#messages_full").prop("checked", options.Messages.isFull);
        $("#messages_full_show").prop("checked", options.Messages.isShowMore);
        $("#message_is_filter").prop("checked", options.Messages.isFilterKeyword).change();
        $("#filterKeywords").val(options.Messages.FilterKeyWords.join('\n'));
        // 评论列表
        $("#messages_download_full_comments").prop("checked", options.Messages.Comments.isFull).change();
        $("#messages_comments_min").val(options.Messages.Comments.randomSeconds.min);
        $("#messages_comments_max").val(options.Messages.Comments.randomSeconds.max);
        $("#messages_comments_limit").val(options.Messages.Comments.pageSize);
        // 点赞列表
        $("#messages_has_like").prop("checked", options.Messages.Like.isGet).change();
        $("#messages_like_min").val(options.Messages.Like.randomSeconds.min);
        $("#messages_like_max").val(options.Messages.Like.randomSeconds.max);

        // 最近访问
        $("#messages_has_visitor").prop("checked", options.Messages.Visitor.isGet).change();
        $("#messages_visitor_min").val(options.Messages.Visitor.randomSeconds.min);
        $("#messages_visitor_max").val(options.Messages.Visitor.randomSeconds.max);

        // 日志模块赋值
        $("#blogs_exportFormat").val(options.Blogs.exportType).change();
        $("#blogs_increment_type").val(options.Blogs.IncrementType).change();
        $("#blogs_increment_time").val(options.Blogs.IncrementTime);
        $("#blogs_list_cost_min").val(options.Blogs.randomSeconds.min);
        $("#blogs_list_cost_max").val(options.Blogs.randomSeconds.max);
        $("#blogs_info_cost_min").val(options.Blogs.Info.randomSeconds.min);
        $("#blogs_info_cost_max").val(options.Blogs.Info.randomSeconds.max);
        $("#blogs_list_limit").val(options.Blogs.pageSize);
        // 评论列表
        $("#blogs_download_full_comments").prop("checked", options.Blogs.Comments.isFull).change();
        $("#blogs_comments_min").val(options.Blogs.Comments.randomSeconds.min);
        $("#blogs_comments_max").val(options.Blogs.Comments.randomSeconds.max);
        $("#blogs_comments_limit").val(options.Blogs.Comments.pageSize);
        // 点赞列表
        $("#blogs_has_like").prop("checked", options.Blogs.Like.isGet).change();
        $("#blogs_like_min").val(options.Blogs.Like.randomSeconds.min);
        $("#blogs_like_max").val(options.Blogs.Like.randomSeconds.max);
        // 最近访问
        $("#blogs_has_visitor").prop("checked", options.Blogs.Visitor.isGet).change();
        $("#blogs_visitor_min").val(options.Blogs.Visitor.randomSeconds.min);
        $("#blogs_visitor_max").val(options.Blogs.Visitor.randomSeconds.max);

        // 私密日志赋值
        $("#diaries_exportFormat").val(options.Diaries.exportType).change();
        $("#diaries_increment_type").val(options.Diaries.IncrementType).change();
        $("#diaries_increment_time").val(options.Diaries.IncrementTime);
        $("#diaries_list_cost_min").val(options.Diaries.randomSeconds.min);
        $("#diaries_list_cost_max").val(options.Diaries.randomSeconds.max);
        $("#diaries_info_cost_min").val(options.Diaries.Info.randomSeconds.min);
        $("#diaries_info_cost_max").val(options.Diaries.Info.randomSeconds.max);
        $("#diaries_list_limit").val(options.Diaries.pageSize);
        // 评论列表
        $("#diaries_download_full_comments").prop("checked", options.Diaries.Comments.isFull).change();
        $("#diaries_comments_min").val(options.Diaries.Comments.randomSeconds.min);
        $("#diaries_comments_max").val(options.Diaries.Comments.randomSeconds.max);
        $("#diaries_comments_limit").val(options.Diaries.Comments.pageSize);
        // 点赞列表
        $("#diaries_has_like").prop("checked", options.Diaries.Like.isGet).change();
        $("#diaries_like_min").val(options.Diaries.Like.randomSeconds.min);
        $("#diaries_like_max").val(options.Diaries.Like.randomSeconds.max);
        // 最近访问
        $("#diaries_has_visitor").prop("checked", options.Diaries.Visitor.isGet).change();
        $("#diaries_visitor_min").val(options.Diaries.Visitor.randomSeconds.min);
        $("#diaries_visitor_max").val(options.Diaries.Visitor.randomSeconds.max);

        // 相册模块赋值
        $("#photos_exportFormat").val(options.Photos.exportType).change();
        $("#photos_increment_type").val(options.Photos.IncrementType).change();
        $("#photos_increment_time").val(options.Photos.IncrementTime);
        $("#photos_list_cost_min").val(options.Photos.randomSeconds.min);
        $("#photos_list_cost_max").val(options.Photos.randomSeconds.max);
        $("#photos_list_limit").val(options.Photos.pageSize);
        $("#photos_albums_sort_type").val(options.Photos.SortType);
        $("#photos_albums_folder_rename_type").val(options.Photos.RenameType);
        $("#photos_albums_comments_has").prop("checked", options.Photos.Comments.isGet).change();
        $("#photos_albums_comments_cost_min").val(options.Photos.Comments.randomSeconds.min);
        $("#photos_albums_comments_cost_max").val(options.Photos.Comments.randomSeconds.max);
        $("#photos_albums_comments_limit").val(options.Photos.Comments.pageSize);
        // 相片列表
        $("#photos_images_list_type").val(options.Photos.Images.listType).change();
        // 文件夹结构类型
        $("#photos_file_structure_type").val(options.Photos.Images.fileStructureType);
        $("#photos_images_rename_type").val(options.Photos.Images.RenameType);
        $("#photos_images_cost_min").val(options.Photos.Images.randomSeconds.min);
        $("#photos_images_cost_max").val(options.Photos.Images.randomSeconds.max);
        $("#photos_images_limit").val(options.Photos.Images.pageSize);
        $("#photos_images_comments_has").prop("checked", options.Photos.Images.Comments.isGet).change();
        $("#photos_images_comments_cost_min").val(options.Photos.Images.Comments.randomSeconds.min);
        $("#photos_images_comments_cost_max").val(options.Photos.Images.Comments.randomSeconds.max);
        $("#photos_images_comments_limit").val(options.Photos.Images.Comments.pageSize);
        $("#photos_exifType").val(options.Photos.Images.exifType);
        $("#photos_isGetDetail").prop("checked", options.Photos.Images.Info.isGet).change();
        $("#photos_images_detail_cost_min").val(options.Photos.Images.Info.randomSeconds.min);
        $("#photos_images_detail_cost_max").val(options.Photos.Images.Info.randomSeconds.max);
        $("#photos_images_detail_limit").val(options.Photos.Images.Info.pageSize);
        $("#photos_isGetVideo").prop("checked", options.Photos.Images.isGetVideo).change();
        $("#photos_isGetPreview").prop("checked", options.Photos.Images.isGetPreview).change();
        // 点赞列表
        $("#photos_has_like").prop("checked", options.Photos.Like.isGet).change();
        $("#photos_like_min").val(options.Photos.Like.randomSeconds.min);
        $("#photos_like_max").val(options.Photos.Like.randomSeconds.max);
        // 最近访问
        $("#albums_has_visitor").prop("checked", options.Photos.Visitor.isGet).change();
        $("#albums_visitor_min").val(options.Photos.Visitor.randomSeconds.min);
        $("#albums_visitor_max").val(options.Photos.Visitor.randomSeconds.max);

        // 视频模块赋值
        $("#videos_exportFormat").val(options.Videos.exportType).change();
        $("#videos_file_structure_type").val(options.Videos.fileStructureType);
        $("#videos_file_rename_type").val(options.Videos.RenameType);
        $("#videos_increment_type").val(options.Videos.IncrementType).change();
        $("#videos_increment_time").val(options.Videos.IncrementTime);
        $("#videos_list_cost_min").val(options.Videos.randomSeconds.min);
        $("#videos_list_cost_max").val(options.Videos.randomSeconds.max);
        $("#videos_list_limit").val(options.Videos.pageSize);

        $("#videos_has_comments").prop("checked", options.Videos.Comments.isGet).change();
        $("#videos_comments_min").val(options.Videos.Comments.randomSeconds.min);
        $("#videos_comments_max").val(options.Videos.Comments.randomSeconds.max);
        $("#videos_comments_limit").val(options.Videos.Comments.pageSize);

        $("#videos_has_like").prop("checked", options.Videos.Like.isGet).change();
        $("#videos_like_min").val(options.Videos.Like.randomSeconds.min);
        $("#videos_like_max").val(options.Videos.Like.randomSeconds.max);

        // 留言模块赋值
        $("#boards_exportFormat").val(options.Boards.exportType).change();
        $("#boards_increment_type").val(options.Boards.IncrementType).change();
        $("#boards_increment_time").val(options.Boards.IncrementTime);
        $("#boards_list_cost_min").val(options.Boards.randomSeconds.min);
        $("#boards_list_cost_max").val(options.Boards.randomSeconds.max);
        $("#boards_list_cost").val(options.Boards.querySleep);
        $("#boards_list_limit").val(options.Boards.pageSize);

        // 好友模块赋值
        $("#friends_exportFormat").val(options.Friends.exportType).change();
        $("#friends_list_min").val(options.Friends.randomSeconds.min);
        $("#friends_list_max").val(options.Friends.randomSeconds.max);
        $("#friends_interactive_info").prop("checked", options.Friends.Interactive);
        $("#friends_care_list").prop("checked", options.Friends.SpecialCare);
        $("#friends_is_increment").prop("checked", options.Friends.isIncrement);
        $("#friends_special_group").selectpicker('val', options.Friends.SpecialGroup);

        // 收藏模块赋值
        $("#favorites_exportFormat").val(options.Favorites.exportType);
        $("#favorites_increment_type").val(options.Favorites.IncrementType).change();
        $("#favorites_increment_time").val(options.Favorites.IncrementTime);
        $("#favorites_list_cost_min").val(options.Favorites.randomSeconds.min);
        $("#favorites_list_cost_max").val(options.Favorites.randomSeconds.max);
        $("#favorites_list_limit").val(options.Favorites.pageSize);

        // 分享模块赋值
        $("#shares_exportFormat").val(options.Shares.exportType).change();
        $("#shares_increment_type").val(options.Shares.IncrementType).change();
        $("#shares_increment_time").val(options.Shares.IncrementTime);
        $("#shares_list_cost_min").val(options.Shares.randomSeconds.min);
        $("#shares_list_cost_max").val(options.Shares.randomSeconds.max);
        $("#shares_info_cost_min").val(options.Shares.Info.randomSeconds.min);
        $("#shares_info_cost_max").val(options.Shares.Info.randomSeconds.max);
        $("#shares_list_limit").val(options.Shares.pageSize);
        // 评论列表
        $("#shares_download_full_comments").prop("checked", options.Shares.Comments.isFull).change();
        $("#shares_comments_min").val(options.Shares.Comments.randomSeconds.min);
        $("#shares_comments_max").val(options.Shares.Comments.randomSeconds.max);
        $("#shares_comments_limit").val(options.Shares.Comments.pageSize);
        // 点赞列表
        $("#shares_has_like").prop("checked", options.Shares.Like.isGet).change();
        $("#shares_like_min").val(options.Shares.Like.randomSeconds.min);
        $("#shares_like_max").val(options.Shares.Like.randomSeconds.max);
        // 最近访问
        $("#shares_has_visitor").prop("checked", options.Shares.Visitor.isGet).change();
        $("#shares_visitor_min").val(options.Shares.Visitor.randomSeconds.min);
        $("#shares_visitor_max").val(options.Shares.Visitor.randomSeconds.max);

        // 分享模块赋值
        $("#visitors_exportFormat").val(options.Visitors.exportType);
        $("#visitors_increment_type").val(options.Visitors.IncrementType).change();
        $("#visitors_increment_time").val(options.Visitors.IncrementTime);
        $("#visitors_list_cost_min").val(options.Visitors.randomSeconds.min);
        $("#visitors_list_cost_max").val(options.Visitors.randomSeconds.max);

        // 公共模块赋值
        $("#common_list_retry_count").val(options.Common.listRetryCount);
        $("#common_list_retry_sleep").val(options.Common.listRetrySleep);
        $("#common_wait_count").val(options.Common.waitCount);
        $("#common_wait_time").val(options.Common.waitTime);
        $("#common_rest_sleep_url").selectpicker('val', options.Common.RestSleepUrls);
        $("#common_download_type").val(options.Common.downloadType).change();
        $('#common_download_status').prop("checked", options.Common.disabledShelf);
        chrome.downloads.setShelfEnabled && chrome.downloads.setShelfEnabled(!options.Common.disabledShelf);
        $("#common_thunder_task_count").val(options.Common.thunderTaskNum);
        $("#common_thunder_task_sleep").val(options.Common.thunderTaskSleep);
        $("#common_download_thread").val(options.Common.downloadThread);
        $("#common_download_sleep").val(options.Common.downloadSleep);
        $("#common_aria2_rpc").val(options.Common.Aria2.rpc);
        $("#common_aria2_token").val(options.Common.Aria2.token || '');
        $('#common_user_link').prop("checked", options.Common.hasUserLink);


        // 开发者
        $('#dev_maps_tx_key').val(options.Dev.Maps.TxKey);
        $('#dev_maps_bd_key').val(options.Dev.Maps.BdKey);
        $('#dev_maps_gd_key').val(options.Dev.Maps.GdKey);

        // 那年今日
        renderValueToDom(options, 'hasThatYearToday');

        // 微信坐标
        renderValueToDom(options, 'refreshWeChatLbs');

        // 语音说说
        renderValueToDom(options, 'GetVoice');

        // 图片类型识别
        renderValueToDom(options, 'isAutoFileSuffix');

        // 图片类型识别超时时间
        renderValueToDom(options, 'autoFileSuffixTimeOut');

        // 显示方式
        renderValueToDom(options, 'showType');

        // 排序类型
        renderValueToDom(options, 'SortType');

        // 排序类型
        renderValueToDom(options, 'AvatarHost');

        // 视图类型
        renderValueToDom(options, 'viewType');

        // 空间权限
        renderValueToDom(options, 'ZoneAccess');

        // 引用来源
        $('#common_refererUrls').val(QZone_Config.Common.refererUrls.join('\n'));
    }

    // 读取数据，第一个参数是指定要读取的key以及设置默认值
    chrome.storage.sync.get(Default_Config, function(options) {

        console.info('读取配置完成！', options);
        QZone_Config = Object.assign({}, options);

        // 处理旧版本的分享源
        const newSourceType = [];
        if (QZone_Config.Shares.SourceType) {
            for (const source of QZone_Config.Shares.SourceType) {
                if (!Array.isArray(source.regulars)) {
                    newSourceType.push(source);
                    continue;
                }
                for (const regular of source.regulars) {
                    newSourceType.push(Object.assign({}, {
                        name: source.name,
                        regulars: regular
                    }));
                }
            }
        }
        QZone_Config.Shares.SourceType = newSourceType;

        // 填充数据
        loadOptions(options);
    });

    /**
     * 根据表单设置更新配置项
     * @param {Object} options 配置项
     * @param {string} field 属性名称
     */
    const setValueByFrom = (options, field) => {
        const $fields = $('input[name="' + field + '"],select[name="' + field + '"]');
        for (const item of $fields) {
            const moduleName = $(item).attr('data-module');
            if (!moduleName) {
                continue;
            }
            const inputType = $(item).attr('type');
            if (inputType === 'checkbox') {
                options[moduleName][field] = $(item).prop("checked");
            } else if (inputType === 'number') {
                options[moduleName][field] = $(item).val() * 1;
            } else {
                options[moduleName][field] = $(item).val();
            }
        }
    }

    let setOptions = () => {

        // 说说模块赋值
        QZone_Config.Messages.exportType = $("#messages_exportFormat").val();
        QZone_Config.Messages.IncrementType = $("#messages_increment_type").val();
        QZone_Config.Messages.IncrementTime = $("#messages_increment_time").val();
        QZone_Config.Messages.randomSeconds.min = $("#messages_list_cost_min").val() * 1;
        QZone_Config.Messages.randomSeconds.max = $("#messages_list_cost_max").val() * 1;
        QZone_Config.Messages.pageSize = $("#messages_list_limit").val() * 1;
        QZone_Config.Messages.isFull = $("#messages_full").prop("checked");
        QZone_Config.Messages.isShowMore = $("#messages_full_show").prop("checked");
        QZone_Config.Messages.isFilterKeyword = $("#message_is_filter").prop("checked");
        QZone_Config.Messages.FilterKeyWords = $("#filterKeywords").val().split('\n');
        // 评论列表
        QZone_Config.Messages.Comments.isFull = $("#messages_download_full_comments").prop("checked");
        QZone_Config.Messages.Comments.randomSeconds.min = $("#messages_comments_min").val() * 1;
        QZone_Config.Messages.Comments.randomSeconds.max = $("#messages_comments_max").val() * 1;
        QZone_Config.Messages.Comments.pageSize = $("#messages_comments_limit").val() * 1;
        // 点赞列表
        QZone_Config.Messages.Like.isGet = $("#messages_has_like").prop("checked");
        QZone_Config.Messages.Like.randomSeconds.min = $("#messages_like_min").val() * 1;
        QZone_Config.Messages.Like.randomSeconds.max = $("#messages_like_max").val() * 1;
        // 最近访问
        QZone_Config.Messages.Visitor.isGet = $("#messages_has_visitor").prop("checked");
        QZone_Config.Messages.Visitor.randomSeconds.min = $("#messages_visitor_min").val() * 1;
        QZone_Config.Messages.Visitor.randomSeconds.max = $("#messages_visitor_max").val() * 1;

        // 日志模块赋值
        QZone_Config.Blogs.exportType = $("#blogs_exportFormat").val();
        QZone_Config.Blogs.IncrementType = $("#blogs_increment_type").val();
        QZone_Config.Blogs.IncrementTime = $("#blogs_increment_time").val();
        QZone_Config.Blogs.randomSeconds.min = $("#blogs_list_cost_min").val() * 1;
        QZone_Config.Blogs.randomSeconds.max = $("#blogs_list_cost_max").val() * 1;
        QZone_Config.Blogs.Info.randomSeconds.min = $("#blogs_info_cost_min").val() * 1;
        QZone_Config.Blogs.Info.randomSeconds.max = $("#blogs_info_cost_max").val() * 1;
        QZone_Config.Blogs.pageSize = $("#blogs_list_limit").val() * 1;
        // 评论列表
        QZone_Config.Blogs.Comments.isFull = $("#blogs_download_full_comments").prop("checked");
        QZone_Config.Blogs.Comments.randomSeconds.min = $("#blogs_comments_min").val() * 1;
        QZone_Config.Blogs.Comments.randomSeconds.max = $("#blogs_comments_max").val() * 1;
        QZone_Config.Blogs.Comments.pageSize = $("#blogs_comments_limit").val() * 1;
        // 点赞列表
        QZone_Config.Blogs.Like.isGet = $("#blogs_has_like").prop("checked");
        QZone_Config.Blogs.Like.randomSeconds.min = $("#blogs_like_min").val() * 1;
        QZone_Config.Blogs.Like.randomSeconds.max = $("#blogs_like_max").val() * 1;
        // 最近访问
        QZone_Config.Blogs.Visitor.isGet = $("#blogs_has_visitor").prop("checked");
        QZone_Config.Blogs.Visitor.randomSeconds.min = $("#blogs_visitor_min").val() * 1;
        QZone_Config.Blogs.Visitor.randomSeconds.max = $("#blogs_visitor_max").val() * 1;

        // 私密日志赋值
        QZone_Config.Diaries.exportType = $("#diaries_exportFormat").val();
        QZone_Config.Diaries.IncrementType = $("#diaries_increment_type").val();
        QZone_Config.Diaries.IncrementTime = $("#diaries_increment_time").val();
        QZone_Config.Diaries.randomSeconds.min = $("#diaries_list_cost_min").val() * 1;
        QZone_Config.Diaries.randomSeconds.max = $("#diaries_list_cost_max").val() * 1;
        QZone_Config.Diaries.Info.randomSeconds.min = $("#diaries_info_cost_min").val() * 1;
        QZone_Config.Diaries.Info.randomSeconds.max = $("#diaries_info_cost_max").val() * 1;
        QZone_Config.Diaries.pageSize = $("#diaries_list_limit").val() * 1;
        // 评论列表
        QZone_Config.Diaries.Comments.isFull = $("#diaries_download_full_comments").prop("checked");
        QZone_Config.Diaries.Comments.randomSeconds.min = $("#diaries_comments_min").val() * 1;
        QZone_Config.Diaries.Comments.randomSeconds.max = $("#diaries_comments_max").val() * 1;
        QZone_Config.Diaries.Comments.pageSize = $("#diaries_comments_limit").val() * 1;
        // 点赞列表
        QZone_Config.Diaries.Like.isGet = $("#diaries_has_like").prop("checked");
        QZone_Config.Diaries.Like.randomSeconds.min = $("#diaries_like_min").val() * 1;
        QZone_Config.Diaries.Like.randomSeconds.max = $("#diaries_like_max").val() * 1;
        // 最近访问
        QZone_Config.Diaries.Visitor.isGet = $("#diaries_has_visitor").prop("checked");
        QZone_Config.Diaries.Visitor.randomSeconds.min = $("#diaries_visitor_min").val() * 1;
        QZone_Config.Diaries.Visitor.randomSeconds.max = $("#diaries_visitor_max").val() * 1;

        // 相册模块赋值
        QZone_Config.Photos.exportType = $("#photos_exportFormat").val();
        QZone_Config.Photos.IncrementType = $("#photos_increment_type").val();
        QZone_Config.Photos.IncrementTime = $("#photos_increment_time").val();
        QZone_Config.Photos.pageSize = $("#photos_list_limit").val() * 1;
        QZone_Config.Photos.SortType = $("#photos_albums_sort_type").val();
        QZone_Config.Photos.RenameType = $("#photos_albums_folder_rename_type").val();
        QZone_Config.Photos.randomSeconds.min = $("#photos_list_cost_min").val() * 1;
        QZone_Config.Photos.randomSeconds.max = $("#photos_list_cost_max").val() * 1;
        QZone_Config.Photos.Comments.isGet = $("#photos_albums_comments_has").prop("checked");
        QZone_Config.Photos.Comments.randomSeconds.min = $("#photos_albums_comments_cost_min").val() * 1;
        QZone_Config.Photos.Comments.randomSeconds.max = $("#photos_albums_comments_cost_max").val() * 1;
        QZone_Config.Photos.Comments.pageSize = $("#photos_albums_comments_limit").val() * 1;

        QZone_Config.Photos.Images.RenameType = $("#photos_images_rename_type").val();
        QZone_Config.Photos.Images.listType = $("#photos_images_list_type").val();
        QZone_Config.Photos.Images.fileStructureType = $("#photos_file_structure_type").val();
        QZone_Config.Photos.Images.randomSeconds.min = $("#photos_images_cost_min").val() * 1;
        QZone_Config.Photos.Images.randomSeconds.max = $("#photos_images_cost_max").val() * 1;
        QZone_Config.Photos.Images.pageSize = $("#photos_images_limit").val() * 1;
        QZone_Config.Photos.Images.Comments.isGet = $("#photos_images_comments_has").prop("checked");
        QZone_Config.Photos.Images.Comments.randomSeconds.min = $("#photos_images_comments_cost_min").val() * 1;
        QZone_Config.Photos.Images.Comments.randomSeconds.max = $("#photos_images_comments_cost_max").val() * 1;
        QZone_Config.Photos.Images.Comments.pageSize = $("#photos_images_comments_limit").val() * 1;
        QZone_Config.Photos.Images.exifType = $("#photos_exifType").val();
        QZone_Config.Photos.Images.Info.isGet = $("#photos_isGetDetail").prop("checked");
        QZone_Config.Photos.Images.Info.randomSeconds.min = $("#photos_images_detail_cost_min").val() * 1;
        QZone_Config.Photos.Images.Info.randomSeconds.max = $("#photos_images_detail_cost_max").val() * 1;
        QZone_Config.Photos.Images.Info.pageSize = $("#photos_images_detail_limit").val() * 1;
        QZone_Config.Photos.Images.isGetVideo = $("#photos_isGetVideo").prop("checked");
        QZone_Config.Photos.Images.isGetPreview = $("#photos_isGetPreview").prop("checked");

        // 点赞列表
        QZone_Config.Photos.Like.isGet = $("#photos_has_like").prop("checked");
        QZone_Config.Photos.Like.randomSeconds.min = $("#photos_like_min").val() * 1;
        QZone_Config.Photos.Like.randomSeconds.max = $("#photos_like_max").val() * 1;
        // 最近访问
        QZone_Config.Photos.Visitor.isGet = $("#albums_has_visitor").prop("checked");
        QZone_Config.Photos.Visitor.randomSeconds.min = $("#albums_visitor_min").val() * 1;
        QZone_Config.Photos.Visitor.randomSeconds.max = $("#albums_visitor_max").val() * 1;

        // 视频模块赋值
        QZone_Config.Videos.exportType = $("#videos_exportFormat").val();
        QZone_Config.Videos.fileStructureType = $("#videos_file_structure_type").val();
        QZone_Config.Videos.RenameType = $("#videos_file_rename_type").val();
        QZone_Config.Videos.IncrementType = $("#videos_increment_type").val();
        QZone_Config.Videos.IncrementTime = $("#videos_increment_time").val();
        QZone_Config.Videos.randomSeconds.min = $("#videos_list_cost_min").val() * 1;
        QZone_Config.Videos.randomSeconds.max = $("#videos_list_cost_max").val() * 1;
        QZone_Config.Videos.pageSize = $("#videos_list_limit").val() * 1;

        QZone_Config.Videos.Like.isGet = $("#videos_has_like").prop("checked");
        QZone_Config.Videos.Like.randomSeconds.min = $("#videos_like_min").val() * 1;
        QZone_Config.Videos.Like.randomSeconds.max = $("#videos_like_max").val() * 1;

        // 视频评论赋值
        QZone_Config.Videos.Comments.isGet = $("#videos_has_comments").prop("checked");
        QZone_Config.Videos.Comments.randomSeconds.min = $("#videos_comments_min").val() * 1;
        QZone_Config.Videos.Comments.randomSeconds.max = $("#videos_comments_max").val() * 1;
        QZone_Config.Videos.Comments.pageSize = $("#videos_comments_limit").val() * 1;

        // 留言模块赋值
        QZone_Config.Boards.exportType = $("#boards_exportFormat").val();
        QZone_Config.Boards.IncrementType = $("#boards_increment_type").val();
        QZone_Config.Boards.IncrementTime = $("#boards_increment_time").val();
        QZone_Config.Boards.randomSeconds.min = $("#boards_list_cost_min").val() * 1;
        QZone_Config.Boards.randomSeconds.max = $("#boards_list_cost_max").val() * 1;
        QZone_Config.Boards.pageSize = $("#boards_list_limit").val() * 1;

        // 好友模块赋值
        QZone_Config.Friends.exportType = $("#friends_exportFormat").val();
        QZone_Config.Friends.randomSeconds.min = $("#friends_list_min").val() * 1;
        QZone_Config.Friends.randomSeconds.max = $("#friends_list_max").val() * 1;
        QZone_Config.Friends.Interactive = $("#friends_interactive_info").prop("checked");
        QZone_Config.Friends.SpecialCare = $("#friends_care_list").prop("checked");
        QZone_Config.Friends.isIncrement = $("#friends_is_increment").prop("checked");
        QZone_Config.Friends.SpecialGroup = $("#friends_special_group").val();

        // 收藏模块赋值
        QZone_Config.Favorites.exportType = $("#favorites_exportFormat").val();
        QZone_Config.Favorites.IncrementType = $("#favorites_increment_type").val();
        QZone_Config.Favorites.IncrementTime = $("#favorites_increment_time").val();
        QZone_Config.Favorites.randomSeconds.min = $("#favorites_list_cost_min").val() * 1;
        QZone_Config.Favorites.randomSeconds.max = $("#favorites_list_cost_max").val() * 1;
        QZone_Config.Favorites.pageSize = $("#favorites_list_limit").val() * 1;

        // 分享模块赋值
        QZone_Config.Shares.exportType = $("#shares_exportFormat").val();
        QZone_Config.Shares.IncrementType = $("#shares_increment_type").val();
        QZone_Config.Shares.IncrementTime = $("#shares_increment_time").val();
        QZone_Config.Shares.randomSeconds.min = $("#shares_list_cost_min").val() * 1;
        QZone_Config.Shares.randomSeconds.max = $("#shares_list_cost_max").val() * 1;
        QZone_Config.Shares.Info.randomSeconds.min = $("#shares_info_cost_min").val() * 1;
        QZone_Config.Shares.Info.randomSeconds.max = $("#shares_info_cost_max").val() * 1;
        QZone_Config.Shares.pageSize = $("#shares_list_limit").val() * 1;
        // 评论列表
        QZone_Config.Shares.Comments.isFull = $("#shares_download_full_comments").prop("checked");
        QZone_Config.Shares.Comments.randomSeconds.min = $("#shares_comments_min").val() * 1;
        QZone_Config.Shares.Comments.randomSeconds.max = $("#shares_comments_max").val() * 1;
        QZone_Config.Shares.Comments.pageSize = $("#shares_comments_limit").val() * 1;
        // 点赞列表
        QZone_Config.Shares.Like.isGet = $("#shares_has_like").prop("checked");
        QZone_Config.Shares.Like.randomSeconds.min = $("#shares_like_min").val() * 1;
        QZone_Config.Shares.Like.randomSeconds.max = $("#shares_like_max").val() * 1;
        // 最近访问
        QZone_Config.Shares.Visitor.isGet = $("#shares_has_visitor").prop("checked");
        QZone_Config.Shares.Visitor.randomSeconds.min = $("#shares_visitor_min").val() * 1;
        QZone_Config.Shares.Visitor.randomSeconds.max = $("#shares_visitor_max").val() * 1;

        // 访客模块赋值
        QZone_Config.Visitors.exportType = $("#visitors_exportFormat").val();
        QZone_Config.Visitors.IncrementType = $("#visitors_increment_type").val();
        QZone_Config.Visitors.IncrementTime = $("#visitors_increment_time").val();
        QZone_Config.Visitors.randomSeconds.min = $("#visitors_list_cost_min").val() * 1;
        QZone_Config.Visitors.randomSeconds.max = $("#visitors_list_cost_max").val() * 1;

        // 公共模块赋值		
        QZone_Config.Common.listRetryCount = $("#common_list_retry_count").val() * 1;
        QZone_Config.Common.listRetrySleep = $("#common_list_retry_sleep").val() * 1;
        QZone_Config.Common.waitCount = $("#common_wait_count").val() * 1;
        QZone_Config.Common.waitTime = $("#common_wait_time").val() * 1;
        QZone_Config.Common.RestSleepUrls = $("#common_rest_sleep_url").val();
        QZone_Config.Common.downloadType = $('#common_download_type').val();
        QZone_Config.Common.disabledShelf = !$('#common_download_status').prop("checked");
        chrome.downloads.setShelfEnabled && chrome.downloads.setShelfEnabled(!QZone_Config.Common.disabledShelf);
        QZone_Config.Common.thunderTaskNum = $("#common_thunder_task_count").val() * 1;
        QZone_Config.Common.thunderTaskSleep = $("#common_thunder_task_sleep").val() * 1;
        QZone_Config.Common.downloadThread = $("#common_download_thread").val() * 1;
        QZone_Config.Common.downloadSleep = $("#common_download_sleep").val() * 1;
        QZone_Config.Common.Aria2.rpc = $("#common_aria2_rpc").val();
        QZone_Config.Common.Aria2.token = $("#common_aria2_token").val();
        QZone_Config.Common.hasUserLink = $('#common_user_link').prop("checked");

        // 开发者
        QZone_Config.Dev.Maps.TxKey = $("#dev_maps_tx_key").val();
        QZone_Config.Dev.Maps.BdKey = $("#dev_maps_bd_key").val();
        QZone_Config.Dev.Maps.GdKey = $("#dev_maps_gd_key").val();

        // 那年今日
        setValueByFrom(QZone_Config, 'hasThatYearToday');

        // 微信坐标
        setValueByFrom(QZone_Config, 'refreshWeChatLbs');

        // 语音说说
        setValueByFrom(QZone_Config, 'GetVoice');

        // 图片类型识别
        setValueByFrom(QZone_Config, 'isAutoFileSuffix');

        // 图片类型识别超时时间
        setValueByFrom(QZone_Config, 'autoFileSuffixTimeOut');

        // 显示方式
        setValueByFrom(QZone_Config, 'showType');

        // 排序类型
        setValueByFrom(QZone_Config, 'SortType');

        // 头像地址
        setValueByFrom(QZone_Config, 'AvatarHost');

        // 视图类型
        setValueByFrom(QZone_Config, 'viewType');

        // 空间权限
        setValueByFrom(QZone_Config, 'ZoneAccess');

        // 引用来源
        QZone_Config.Common.refererUrls = $('#common_refererUrls').val().split('\n');

        // 获取动态规则
        chrome.declarativeNetRequest && chrome.declarativeNetRequest.getDynamicRules(
            function(res) {

                // 需要添加的规则
                const addRules = [];
                for (let idx = 0; idx < QZone_Config.Common.refererUrls.length; idx++) {
                    const url = QZone_Config.Common.refererUrls[idx];
                    addRules.push({
                        "id": idx + 1,
                        "priority": idx + 1,
                        "action": {
                            "requestHeaders": [{
                                "header": "Referer",
                                "operation": "set",
                                "value": "https://user.qzone.qq.com/"
                            }],
                            "type": "modifyHeaders"
                        },
                        "condition": {
                            "urlFilter": url,
                            "resourceTypes": [
                                "xmlhttprequest"
                            ]
                        }
                    });
                }

                // 删除的规则
                const removeRuleIds = res.map(item => item.id);

                try {
                    // 移除动态规则
                    chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: removeRuleIds
                    }, function() {
                        // 添加动态规则
                        chrome.declarativeNetRequest.updateDynamicRules({
                            addRules: addRules
                        })
                    })
                } catch (error) {
                    try {
                        // 移除动态规则
                        chrome.declarativeNetRequest.updateDynamicRules(removeRuleIds, addRules)
                    } catch (error) {

                    }
                }
            }
        )
        chrome.storage.sync.set(QZone_Config, function() {
            console.info("保存成功！");
        });

        return true;
    }

    // 保存按钮
    $('form').submit(function() {
        if (this.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const isSuccess = setOptions();
        if (!isSuccess) {
            return;
        }
        tips('<span class="text-success">保存成功</span>，<span class="text-danger">刷新空间</span>页面后备份');
        event.preventDefault();
        event.stopPropagation();
        return;
    })

    // 重置按钮
    $('.reset').click(function() {
        const $form = $(this.form);

        // 模块名称
        let moduleName = $form.attr('data-module');

        QZone_Config[moduleName] = Default_Config[moduleName]
        loadOptions(QZone_Config);

        tips('已重置默认值，<strong>确认无误</strong>后保存');
    })

    // 通用联动更改事件监听
    $('[data-hidden="true"]').change(function() {
        const targetLink = $(this).attr('data-target-link');
        if (!targetLink) {
            return;
        }
        const $targetLink = $('[data-link="' + targetLink + '"]');
        if (!$targetLink) {
            return;
        }
        if (this.checked) {
            // 选中，显示目标
            $targetLink.show();
            return;
        }
        $targetLink.hide();
    })

    // Aria2连接测试
    $('#aria2_test').click(function() {
        const $testBtn = $(this);
        $testBtn.text('正在连接');
        $testBtn.attr('disabled', true);
        const rpc = $('#common_aria2_rpc').val();
        let token = $('#common_aria2_token').val();
        token = "token:" + token
        const params = {
            "jsonrpc": "2.0",
            "method": "aria2.getVersion",
            "id": Date.now(),
            "params": [token]
        }
        $.ajax({
            url: rpc,
            type: 'POST',
            data: JSON.stringify(params),
            contentType: "application/json;charset=utf-8",
            success: function(result) {
                tips('<span class="text-info">Aria2连接成功</span>！');
                $testBtn.text('连接成功');
                $testBtn.attr('disabled', false);
            },
            error: function(xhr, status, error) {
                if (xhr.responseJSON) {
                    if (xhr.responseJSON.error.code === 1 || xhr.responseJSON.error.message === "Unauthorized") {
                        $testBtn.text('认证失败');
                        tips('<span style="color:red">Aria2认证失败</span>，请检查令牌是否正确！');
                    } else {
                        $testBtn.text('连接错误');
                    }
                } else {
                    $testBtn.text('连接错误');
                    tips('<span style="color:red">Aria2连接错误</span>，请确认Aria2配置或Aria2服务是否正常！');
                }
                $testBtn.attr('disabled', false);
            }
        });
    })
})()