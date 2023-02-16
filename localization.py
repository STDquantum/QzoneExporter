from time import sleep
import requests
import os
import re
import sys

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
            path = "Local\\js\\" + i.split("/")[-1]
        elif i.endswith("ico"):
            mkdir("Local\\ico")
            path = "Local\\ico\\" + i.split("/")[-1]
        elif i.endswith("css"):
            mkdir("Local\\css")
            path = "Local\\css\\" + i.split("/")[-1]
        elif i.endswith("100"):
            isAvatar = True
            path = "Local\\avatar\\" + re.search(r"\d{4,}", i).group()
        else:
            continue
        print(i)
        if isAvatar:
            res = requests.get(i)
            path += '.' + res.headers["Content-Type"].split('/')[-1]
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
        path = "Local\\emoji\\" + i.split("/")[-1]
        if os.path.exists(get(path)):
            data[i] = path
            s = s.replace(i, pre + data[i])
            print("    Load from disk")
            continue
        res = requests.get(i)
        data[i] = path
        s = s.replace(i, pre + data[i])
        open(get(path), "wb").write(res.content)

    for i in re.findall(r" integrity=.*(?=\")", s):
        s = s.replace(i, "")
    open(get(html), "w", encoding = "utf-8").write(s)

if __name__ == "__main__":
    data = {}
    process(get("index.html"), "")
    for part in ["Messages", "Shares", "Blogs", "Statistics"]:
        for dirpath, dirnames, filenames in os.walk(get(part)):
            if dirpath != get(part): continue
            for file in filenames:
                process(os.path.join(dirpath, file), "..\\")
    
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