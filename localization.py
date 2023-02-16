from time import sleep
import requests
import os
import re
import sys
import json

def get(p):
    return os.path.join(sys.path[0], p)

def mkdir(p):
    os.system("if not exist {0} (mkdir {0})".format(get(p)))

def download(url, p):
    if os.path.exists(p):
        return
    try:
        print(url)
        res = requests.get(url, timeout = 2)
        open(p, "wb").write(res.content)
    except Exception as e:
        print("!!!!", e)
        sleep(5)

def process(html, pre):
    print("\nprocessing...", html)
    s = open(html, "r", encoding = "utf-8").read()

    p = re.compile('(?<=")https://(?:c|q|w|f).*?(?=")')
    l = list(set(p.findall(s)))
    mkdir("Local")
    mkdir("Local\\avatar")
    for i in l:
        if i in data:
            s = s.replace(i, pre + data[i])
            continue
        isAvatar = False
        if i.endswith("js"):
            mkdir("Local\\js")
            path = "Local/js/" + i.split("/")[-1]
        elif i.endswith("ico"):
            mkdir("Local\\ico")
            path = "Local/ico/" + i.split("/")[-1]
        elif i.endswith("css"):
            mkdir("Local\\css")
            path = "Local/css/" + i.split("/")[-1]
        elif i.endswith("100"):
            isAvatar = True
            path = "Local/avatar/" + re.search(r".store.qq.com/qzone/(\d+)", i).group()
        else:
            continue
        print(i)
        if isAvatar:
            uin = re.search(r".store.qq.com/qzone/(\d+)", i).group()
            uin = uin.replace(".store.qq.com/qzone/", "")
            if uin in avatarDict:
                s = s.replace(i, avatarDict[uin])
                print("    Load from disk")
                continue
            res = requests.get(i)
            ext = '.' + res.headers["Content-Type"].split('/')[-1]
            path += ext
            avatarDict[uin] = f'../Local/avatar/{uin}{ext}'
        else:
            if os.path.exists(get(path)):
                data[i] = path
                s = s.replace(i, pre + data[i])
                print("    Load from disk")
                continue
            else:
                try:
                    res = requests.get(i, timeout = 2)
                except Exception as e:
                    print("!!!!", e)
                    sleep(5)
                    continue
        data[i] = path
        s = s.replace(i, pre + data[i])
        open(get(path), "wb").write(res.content)
    
    mkdir("Local\\emoji")
    l = list(set(re.findall(r"(?<=')http://qzonestyle.*?(?=')", s)))
    for i in l:
        if i in data:
            s = s.replace(i, pre + data[i])
            continue
        print(i)
        path = "Local/emoji/" + i.split("/")[-1]
        if os.path.exists(get(path)):
            data[i] = path
            s = s.replace(i, pre + data[i])
            print("    Load from disk")
            continue
        res = requests.get(i)
        data[i] = path
        s = s.replace(i, pre + data[i])
        open(get(path), "wb").write(res.content)

    l = list(set(re.findall(r"(?<=')(.*.jsdelivr.net/gh/ShunCai/QZoneExport@dev/src/img/emoji/(.*?))(?=')", s)))
    for url, em in l:
        download(f"https://raw.githubusercontent.com/ShunCai/QZoneExport/dev/src/img/emoji/{em}", f"Local\\emoji\\{em}")
        s = s.replace(url, f"..\\Local\\emoji\\{em}")

    for i in re.findall(r" integrity=.*(?=\")", s):
        s = s.replace(i, "")
    open(get(html), "w", encoding = "utf-8").write(s)


def l10n():
    process(get("index.html"), "")
    ran = ["Messages", "Shares", "Blogs", "Statistics", "Friends", "Albums", "Boards", "Diaries", "Favorites", "Videos", "Visitors"]
    for part in ran:
        for dirpath, dirnames, filenames in os.walk(get(part)):
            if dirpath != get(part): continue
            for file in filenames:
                if not file.endswith(".html"): continue
                process(os.path.join(dirpath, file), "../")
    
    mkdir("Local\\fonts")
    baseurl = "https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/"
    for i in ["svg", "woff", "woff2", "eot", "ttf"]:
        file = "fontawesome-webfont." + i
        download(baseurl + file, get("Local\\fonts\\" + file))
    
    mkdir("Local\\images")
    baseurl = "https://cdn.jsdelivr.net/npm/lightgallery@2.3.0/"
    download(baseurl + "images/loading.gif", get("Local\\images\\loading.gif"))
    for i in ["woff2", "woff", "svg", "ttf"]:
        file = "lg." + i
        download(baseurl + "fonts/" + file, get("Local\\fonts\\" + file))

    ran = ["Messages", "Shares", "Blogs", "Friends", "Albums", "Boards", "Diaries", "Favorites", "Videos", "Visitors"]
    for part in ran:
        s = open(get(f"{part}\\json\\{part.lower()}.js"), "r", encoding = "utf-8").read()
        l = list(set(re.findall(r'\[em\]e(\d+)\[\/em\]', s)))
        for uid in l:
            download(f"http://qzonestyle.gtimg.cn/qzone/em/e{uid}.gif", f"Local\\emoji\\e{uid}.gif")


def modifyCommonJS():
    s = open(get("Common\\js\\common.js"), "r", encoding = "utf-8").read()

    # 表情包地址的替换
    s = s.replace(r"'http://qzonestyle.gtimg.cn/qzone/em/e{0}.gif'", r"'../Local/emoji/e{0}.gif'")

    # 点赞列表和最近访问中css的修改
    s = s.replace(r'<img class="rounded-circle" src="<%:=API.Common.getUserLogoUrl(item.fuin)%>" alt="" style="height: 50px;width: 50px;">', r'<img class="rounded-circle" src="<%:=API.Common.getUserLogoUrl(item.fuin)%>" alt="" style="height:120%;width:auto;margin-top:-10%">')
    s = s.replace(r'<img class="rounded-circle" src="<%:=API.Common.getUserLogoUrl(item.uin)%>" alt="" style="height: 50px;width: 50px;">', r'<img class="rounded-circle" src="<%:=API.Common.getUserLogoUrl(item.uin)%>" alt="" style="height:120%;width:auto;margin-top:-10%">')
    
    # 头像地址的替换 对函数的修改
    ori = r"""getUserLogoUrl(uin) {
        return "https://qlogo{host}.store.qq.com/qzone/{uin}/{uin}/{size}".format({
            host: uin % 4 || 1,
            uin: uin,
            size: 100
        });
    },"""
    dst = r"""getUserLogoUrl(uin) {
        return avatarDict[uin];
    },"""
    s = s.replace(ori, dst)
    open(get("Common\\js\\common.js"), "w", encoding = "utf-8").write(s)
    

if __name__ == "__main__":
    data = {}

    avatarDict = {}
    try:
        avatarBackUp = open(get("Local\\js\\avatarDict.js"), "r", encoding = "utf-8").read()[13:]
        avatarDict = json.loads(avatarBackUp)
    except: pass
        
    l10n()
    modifyCommonJS()

    avatarBackUp = "avatarDict = " + json.dumps(avatarDict, indent = 4)
    open(get("Local\\js\\avatarDict.js"), "w", encoding = "utf-8").write(avatarBackUp)