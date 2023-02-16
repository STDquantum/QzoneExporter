# 全面更新头像

import requests
import os
import sys
import re
import json

def get(p):
    return os.path.join(sys.path[0], p)

if __name__ == "__main__":
    try:
        oldAvatarDict = json.loads(open(get("Local\\js\\avatarDict.js"), "r", encoding = "utf-8").read()[13:])
    except FileNotFoundError:
        print("先运行一遍localization.py")
        exit(0)

    data = {}
    ran = ["Messages", "Shares", "Blogs", "Friends", "Albums", "Boards", "Diaries", "Favorites", "Videos", "Visitors"]
    for part in ran:
        s = open(get(f"{part}\\json\\{part.lower()}.js"), "r", encoding = "utf-8").read()
        l = list(set(re.findall(r'"uin":(\d+)', s)))
        for uin in l:
            logoUrl = f"https://qlogo{int(uin) % 4 or 1}.store.qq.com/qzone/{uin}/{uin}/100"
            if logoUrl in data: continue
            res = requests.get(logoUrl)
            data[logoUrl] = f'Local/avatar/{uin}.{res.headers["Content-Type"].split("/")[-1]}'
            open(get(data[logoUrl]), "wb").write(res.content)
            print(logoUrl)


    avatarDict = "avatarDict = {"
    for url in data:
        if url.endswith("100"): # 说明这个文件是一个头像
            uid = re.search(r".store.qq.com/qzone/(\d+)", url)
            avatarDict += f'\n    "{uid}": "../Local/avatar/{uid}.{data[url].split(".")[1]}",'
    avatarDict = avatarDict[:-1]
    avatarDict += "\n}"
    open(get("Local\\js\\avatarDict.js"), "w", encoding = "utf-8").write(avatarDict)