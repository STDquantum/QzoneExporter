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
            if file.endswith('.html') or file.endswith('.js'): continue
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
            if file.endswith('.html') or file.endswith('.js'): continue
            path = os.path.join(dirname, file)
            if path not in pathList:
                move(path, "..\\temp\\多余图片\\" + dirname)

if __name__ == "__main__":
    root = "D:/Download/QQ空间备份_405720329/"
    albumClear()
    videoClear()
    # root = "D:/Download/QQ空间备份_405720329/"
    # l = json.loads(open(root + "videos/json/videos.js",
    #                "r", encoding='utf-8').read()[16:])
    # cnt = 0
    # for video in l:
    #     path = root + "Videos/" + video['custom_filepath']
    #     if video['uniKey'] in albumDict:
    #         print(path, albumDict[video['uniKey']])
    #         move(path, albumDict[video['uniKey']])
    #     cnt = cnt + 1
