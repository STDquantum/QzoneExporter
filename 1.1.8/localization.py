import requests
import os
import re
import sys

def get(p):
    return os.path.join(sys.path[0], p)

def mkdir(p):
    os.system('if not exist "{0}" (mkdir "{0}")'.format(get(p)))

def process(html, pre):
    s = open(html, "r", encoding = "utf-8").read()
    p = re.compile('(?<=")https://(?:c|q).*?(?=")')
    l = list(set(p.findall(s)))
    mkdir("Local")
    for i in l:
        if i in data:
            s = s.replace(i, pre + data[i])
            continue
        if i.endswith("js"):
            mkdir("Local\\js")
            path = "Local/js/" + i.split("/")[-1]
        elif i.endswith("css"):
            mkdir("Local\\css")
            path = "Local/css/" + i.split("/")[-1]
        elif i.endswith("ico"):
            mkdir("Local\\ico")
            path = "Local/ico/" + i.split("/")[-1]
        else: continue
        print(i)
        res = requests.get(i)
        data[i] = path
        s = s.replace(i, pre + data[i])
        open(get(path), "w", encoding = "utf-8").write(res.text)
    
    for i in re.findall(r" integrity=.*(?=\")", s):
        s = s.replace(i, "")
    open(get(html), "w", encoding = "utf-8").write(s)

if __name__ == "__main__":
    data = {}
    for dirpath, dirnames, filenames in os.walk(get("html")):
        for file in filenames:
            process(os.path.join(dirpath, file), "../")

    for dirpath, dirnames, filenames in os.walk(get("templates")):
        for file in filenames:
            process(os.path.join(dirpath, file), "../")