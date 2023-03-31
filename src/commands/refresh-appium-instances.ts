import { Command } from './command';
import { AppiumEnvironmentService } from '../services/environment';

export class RefreshAppiumInstancesCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.environment.refresh';

  constructor(private appiumEnvironmentService: AppiumEnvironmentService) {
    super(RefreshAppiumInstancesCommand.NAME);
  }

  public async excute() {
    await this.appiumEnvironmentService.refreshAppiumEnvironment();
  }
}
