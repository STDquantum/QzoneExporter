import requests
import json
import os


def move(src: str, dst: str):
    src = src.replace('/', '\\')
    dst = dst.replace('/', '\\')
    print(src, dst)
    if not os.path.exists(dst):
        os.system("mkdir " + dst)
    os.system('move "{}" "{}"'.format(src, dst))


def download(url, filepath):
    if os.path.exists(filepath):
        return
    res = requests.get(url)
    if res.status_code != 200:
        print(res.text, res.status_code)
        exit(0)
    open(filepath, "wb").write(res.content)
    print(filepath)


def albumClear():
    l = json.loads(open(root + "albums/json/albums.js",
                   "r", encoding='utf-8').read()[16:])
    pathList = []
    for album in l:
        pathList.append("Albums/" + album['custom_filepath'])
        for comment in album["comments"]:
            if "pic" in comment:
                for pic in comment["pic"]:
                    pathList.append("Albums/" + pic['custom_filepath'])
        for photo in album['photoList']:
            pathList.append(photo["custom_filepath"])
            pathList.append(photo["custom_pre_filepath"])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Albums'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


def videoClear():
    l = json.loads(open(root + "videos/json/videos.js",
                   "r", encoding='utf-8').read()[16:])
    pathList = []
    for video in l:
        pathList.append("Videos/" + video['custom_filepath'])
        pathList.append("Videos/" + video['custom_pre_filepath'])
        # for comment in video["comments"]:
        #     if "pic" in comment:
        #         for pic in comment["pic"]:
        #             pathList.append("Videos/" + pic['custom_filepath'])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Videos'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


def messageClear():
    l = json.loads(open(root + "messages/json/messages.js",
                   "r", encoding='utf-8').read()[18:])
    pathList = []
    for message in l:
        for pic in message["custom_images"]:
            if "video_info" in pic:
                pathList.append(
                    "Messages/" + pic["video_info"]['custom_filepath'])
                pathList.append(
                    "Messages/" + pic["video_info"]['custom_pre_filepath'])
            else:
                pathList.append("Messages/" + pic['custom_filepath'])
        for video in message["custom_videos"]:
            try:
                pathList.append("Messages/" + video['custom_filepath'])
            except:
                pass
            pathList.append("Messages/" + video['custom_pre_filepath'])
        for comment in message["custom_comments"]:
            if "pic" in comment:
                for pic in comment["pic"]:
                    pathList.append("Messages/" + pic['custom_filepath'])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Messages'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


def blogClear():
    l = json.loads(open(root + "blogs/json/blogs.js",
                   "r", encoding='utf-8').read()[15:])
    pathList = []
    for blog in l:
        if "img" in blog:
            for i in blog["img"]:
                pathList.append("Blogs/" + i['custom_url'])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Blogs'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


def shareClear():
    l = json.loads(open(root + "shares/json/shares.js",
                   "r", encoding='utf-8').read()[16:])
    pathList = []
    for share in l:
        for pic in share["source"]["images"]:
            pathList.append("Shares/" + pic['custom_filepath'])
        for comment in share["comments"]:
            if "pic" in comment:
                for pic in comment["pic"]:
                    pathList.append("Shares/" + pic['custom_filepath'])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Shares'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


def favoriteClear():
    l = json.loads(open(root + "Favorites/json/favorites.js",
                   "r", encoding='utf-8').read()[19:])
    pathList = []
    for favorite in l:
        if "custom_images" in favorite:
            for img in favorite["custom_images"]:
                pathList.append("Favorites/" + img['custom_filepath'])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Favorites'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


def blogClear():
    l = json.loads(open(root + "blogs/json/blogs.js",
                   "r", encoding='utf-8').read()[15:])
    pathList = []
    for blog in l:
        if "img" in blog:
            for i in blog["img"]:
                pathList.append("Blogs/" + i['custom_url'])

    pathList = [i.replace("/", "\\") for i in pathList]

    for dirname, dirs, files in os.walk('Blogs'):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)


if __name__ == "__main__":
    root = "D:/Download/QQ空间备份_405720329/"
    albumClear()
    videoClear()
    messageClear()
    favoriteClear()
    blogClear()
    shareClear()
