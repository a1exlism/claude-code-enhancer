#!/usr/bin/env python3
"""
Claude Skills 一键安装脚本

功能：
- 自动检测 Claude 配置目录
- 克隆 anthropics/skills 仓库
- 配置插件市场
- 验证安装结果

使用方法：
    python3 skill_install.py [--target skills|marketplace|both]
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any


class SkillInstaller:
    """Claude Skills 安装器"""

    SKILLS_REPO = "https://github.com/anthropics/skills.git"

    def __init__(self):
        self.home = Path.home()
        self.claude_dir = self.home / ".claude"
        self.skills_dir = self.claude_dir / "skills"
        self.plugins_dir = self.claude_dir / "plugins"
        self.marketplaces_dir = self.plugins_dir / "marketplaces"
        self.marketplace_path = self.marketplaces_dir / "anthropics-skills"
        self.config_file = self.plugins_dir / "config.json"

    def check_git(self) -> bool:
        """检查 git 是否安装"""
        try:
            subprocess.run(["git", "--version"],
                         capture_output=True,
                         check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def check_claude_dir(self) -> bool:
        """检查 Claude 配置目录是否存在"""
        return self.claude_dir.exists()

    def create_directories(self):
        """创建必要的目录"""
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        self.marketplaces_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ 创建目录: {self.skills_dir}")
        print(f"✓ 创建目录: {self.marketplaces_dir}")

    def clone_to_skills(self) -> bool:
        """克隆仓库到 skills 目录"""
        print("\n[1/2] 安装 Skills 到 ~/.claude/skills/")

        # 检查是否已存在
        if self.skills_dir.exists() and any(self.skills_dir.iterdir()):
            print(f"⚠ Skills 目录已存在且不为空: {self.skills_dir}")
            response = input("是否覆盖现有内容? (y/N): ").strip().lower()
            if response != 'y':
                print("✓ 跳过 skills 目录安装")
                return True

            # 备份现有内容
            backup_dir = self.claude_dir / f"skills.backup.{os.getpid()}"
            print(f"  备份现有内容到: {backup_dir}")
            shutil.move(str(self.skills_dir), str(backup_dir))
            self.skills_dir.mkdir(parents=True, exist_ok=True)

        # 克隆到临时目录
        temp_dir = self.claude_dir / f"skills-temp-{os.getpid()}"
        try:
            print(f"  克隆仓库: {self.SKILLS_REPO}")
            subprocess.run(
                ["git", "clone", "--depth", "1", self.SKILLS_REPO, str(temp_dir)],
                check=True,
                capture_output=True
            )

            # 复制内容（排除 .git）
            for item in temp_dir.iterdir():
                if item.name != '.git':
                    dest = self.skills_dir / item.name
                    if item.is_dir():
                        shutil.copytree(item, dest, dirs_exist_ok=True)
                    else:
                        shutil.copy2(item, dest)

            print(f"✓ Skills 安装完成: {self.skills_dir}")
            return True

        except subprocess.CalledProcessError as e:
            print(f"✗ 克隆失败: {e.stderr.decode() if e.stderr else str(e)}")
            return False
        finally:
            # 清理临时目录
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

    def clone_to_marketplace(self) -> bool:
        """克隆仓库到 marketplace 目录"""
        print("\n[2/2] 安装 Marketplace 到 ~/.claude/plugins/marketplaces/")

        # 检查是否已存在
        if self.marketplace_path.exists():
            print(f"⚠ Marketplace 已存在: {self.marketplace_path}")
            response = input("是否更新? (y/N): ").strip().lower()
            if response == 'y':
                try:
                    # 尝试 git pull
                    result = subprocess.run(
                        ["git", "-C", str(self.marketplace_path), "pull"],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        print("✓ Marketplace 更新完成")
                        return True
                    else:
                        print("⚠ 更新失败，将重新克隆")
                        shutil.rmtree(self.marketplace_path)
                except Exception as e:
                    print(f"⚠ 更新失败: {e}，将重新克隆")
                    shutil.rmtree(self.marketplace_path)
            else:
                print("✓ 跳过 marketplace 安装")
                return True

        # 克隆仓库
        try:
            print(f"  克隆仓库: {self.SKILLS_REPO}")
            subprocess.run(
                ["git", "clone", self.SKILLS_REPO, str(self.marketplace_path)],
                check=True,
                capture_output=True
            )
            print(f"✓ Marketplace 安装完成: {self.marketplace_path}")
            return True

        except subprocess.CalledProcessError as e:
            print(f"✗ 克隆失败: {e.stderr.decode() if e.stderr else str(e)}")
            return False

    def update_config(self) -> bool:
        """更新插件配置文件"""
        print("\n配置插件市场...")

        # 读取现有配置
        config: Dict[str, Any] = {"repositories": {}}
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            except json.JSONDecodeError:
                print("⚠ 配置文件格式错误，将创建新配置")

        # 更新 marketplaces 配置
        if "marketplaces" not in config:
            config["marketplaces"] = {}

        config["marketplaces"]["anthropic-agent-skills"] = {
            "path": str(self.marketplace_path)
        }

        # 写入配置
        try:
            self.config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print(f"✓ 配置文件已更新: {self.config_file}")
            return True
        except Exception as e:
            print(f"✗ 配置文件更新失败: {e}")
            return False

    def verify_installation(self) -> bool:
        """验证安装结果"""
        print("\n验证安装...")

        success = True

        # 检查 skills 目录
        if self.skills_dir.exists():
            doc_skills = self.skills_dir / "document-skills"
            if doc_skills.exists():
                skills = list(doc_skills.iterdir())
                print(f"✓ Document Skills: {len(skills)} 个")
                for skill in sorted(skills):
                    if skill.is_dir():
                        print(f"  - {skill.name}")
            else:
                print("✗ Document Skills 未找到")
                success = False

            # 统计 example skills
            example_skills = [d for d in self.skills_dir.iterdir()
                            if d.is_dir() and d.name != "document-skills"
                            and not d.name.startswith('.')]
            if example_skills:
                print(f"✓ Example Skills: {len(example_skills)} 个")
                for skill in sorted(example_skills)[:5]:
                    print(f"  - {skill.name}")
                if len(example_skills) > 5:
                    print(f"  ... 还有 {len(example_skills) - 5} 个")
        else:
            print("✗ Skills 目录未找到")
            success = False

        # 检查 marketplace
        if self.marketplace_path.exists():
            print(f"✓ Marketplace: {self.marketplace_path}")
        else:
            print("⚠ Marketplace 未安装（可选）")

        # 检查配置文件
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                if "marketplaces" in config and "anthropic-agent-skills" in config["marketplaces"]:
                    print("✓ 插件配置已更新")
                else:
                    print("⚠ 插件配置未找到（可选）")
            except:
                print("⚠ 配置文件读取失败")

        return success

    def install(self, target: str = "both") -> bool:
        """执行安装

        Args:
            target: 安装目标 (skills|marketplace|both)
        """
        print("=" * 60)
        print("Claude Skills 一键安装脚本")
        print("=" * 60)

        # 检查前置条件
        if not self.check_git():
            print("✗ 错误: 未找到 git 命令，请先安装 git")
            return False

        if not self.check_claude_dir():
            print(f"⚠ Claude 配置目录不存在: {self.claude_dir}")
            response = input("是否创建? (y/N): ").strip().lower()
            if response != 'y':
                print("✗ 安装已取消")
                return False

        # 创建必要目录
        self.create_directories()

        # 执行安装
        success = True

        if target in ("skills", "both"):
            if not self.clone_to_skills():
                success = False

        if target in ("marketplace", "both"):
            if not self.clone_to_marketplace():
                success = False
            else:
                # 只有 marketplace 安装成功才更新配置
                if not self.update_config():
                    success = False

        # 验证安装
        if success:
            success = self.verify_installation()

        # 输出结果
        print("\n" + "=" * 60)
        if success:
            print("✓ 安装完成！")
            print("\n使用方法:")
            print("  在 Claude Code 对话中直接提及 skill 名称即可使用")
            print("  例如: '使用 pdf skill 提取文档内容'")
        else:
            print("✗ 安装过程中出现错误，请检查上述输出")
        print("=" * 60)

        return success


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Claude Skills 一键安装脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 安装所有内容（推荐）
  python3 skill_install.py

  # 仅安装 skills
  python3 skill_install.py --target skills

  # 仅安装 marketplace
  python3 skill_install.py --target marketplace
        """
    )

    parser.add_argument(
        "--target",
        choices=["skills", "marketplace", "both"],
        default="both",
        help="安装目标 (默认: both)"
    )

    args = parser.parse_args()

    installer = SkillInstaller()
    success = installer.install(args.target)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
