from typing import Optional

from fastapi import APIRouter, Body, Header

from core.utils import error_response, success_response
from schemas.script_schema import AuthLoginRequest, AuthRegisterRequest
from services import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", summary="邮箱注册")
async def register(request: AuthRegisterRequest):
    try:
        payload = await AuthService.register(request)
        return success_response(data=payload.model_dump(mode="json"), message="注册成功")
    except ValueError as error:
        return error_response(message=str(error), code=400)


@router.post("/login", summary="邮箱密码登录")
async def login(request: AuthLoginRequest):
    try:
        payload = await AuthService.login(request)
        return success_response(data=payload.model_dump(mode="json"), message="登录成功")
    except ValueError as error:
        return error_response(message=str(error), code=400)


@router.get("/me", summary="当前用户")
async def me(x_user_id: Optional[str] = Header(default=None, alias="X-User-Id")):
    if not x_user_id:
        return error_response(message="缺少 X-User-Id", code=401)
    user = await AuthService.me(x_user_id)
    if not user:
        return error_response(message="用户不存在", code=404)
    return success_response(data=user.model_dump(mode="json"))


@router.get("/credits", summary="当前用户额度")
async def credits(x_user_id: Optional[str] = Header(default=None, alias="X-User-Id")):
    if not x_user_id:
        return error_response(message="缺少 X-User-Id", code=401)
    payload = await AuthService.credits(x_user_id)
    if payload is None:
        return error_response(message="用户不存在", code=404)
    return success_response(data=payload)


@router.post("/credits/redeem", summary="兑换额度")
async def redeem_credits(
    code: str = Body(..., embed=True),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    if not x_user_id:
        return error_response(message="缺少 X-User-Id", code=401)
    try:
        payload = await AuthService.redeem_credits(x_user_id, code)
    except ValueError as error:
        return error_response(message=str(error), code=400)
    if payload is None:
        return error_response(message="用户不存在", code=404)
    return success_response(data=payload, message="兑换成功")
