# Blog Workspace

一个基于 `Vue 3 + TypeScript + FastAPI` 的博客项目，内置管理员后台、Markdown 编辑和视频文章支持。

## 功能

- 公开博客首页与文章详情页
- 管理员账号登录
- Markdown 编辑与实时预览
- 视频外链或本地视频上传
- 文章发布 / 草稿状态
- SQLite 持久化，适合先快速启动

## 目录

- `frontend/`：Vue 3 + TypeScript 管理台与博客前端
- `backend/`：FastAPI API、鉴权、文章管理、视频上传

## 后端启动

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

默认地址：`http://127.0.0.1:8000`

首次启动会自动创建管理员账号：

- 用户名：`admin`
- 密码：`admin123456`

建议启动前覆盖环境变量：

```powershell
$env:ADMIN_USERNAME="your-admin"
$env:ADMIN_PASSWORD="change-me-now"
```

## 前端启动

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

默认地址：`http://127.0.0.1:5173`

## 主要接口

- `POST /api/auth/login`
- `GET /api/posts`
- `GET /api/posts/{slug}`
- `GET /api/admin/posts`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/{id}`
- `DELETE /api/admin/posts/{id}`
- `POST /api/uploads/video`

## 视频支持

- 可以直接填写视频 URL
- 可以上传 mp4 / webm / ogg，本地文件由 FastAPI 静态托管
- 前端详情页会自动优先播放上传视频，其次播放视频链接

# isaacyn_nn
