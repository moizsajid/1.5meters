# inference.py is an additional component written by John Ridley and Moiz Sajid to support application of the model to 1.5meters.

import os
import json, cv2
import base64, torchvision
from io import BytesIO
from PIL import Image

import torch
from PIL import Image, ImageFile
from openpifpaf import show

from .network import PifPaf, MonoLoco
from .network.process import factory_for_gt, preprocess_pifpaf, image_transform
from .run import cli


class Args:
    def __init__(self):
        self.images = True
        self.batch_size = 1
        self.basenet=None,
        self.checkpoint=None
        self.command='predict'
        self.connection_method='max'
        self.debug_file_prefix=None
        self.debug_paf_indices=[]
        self.debug_pif_indices=[]
        self.decoder_workers=None
        self.dilation=None
        self.dilation_end=None
        self.draw_box=False
        self.dropout=0.2
        self.fixed_b=None
        self.force_complete_pose=True
        self.head_dilation=1
        self.head_dropout=0.0
        self.head_kernel_size=1
        self.head_padding=0
        self.head_quad=0
        self.headnets=['pif', 'paf']
        self.hidden_size=512
        self.instance_threshold=0.15
        self.keypoint_threshold=None
        self.model='model.pkl'
        self.n_dropout=0
        self.networks=['monoloco']
        self.output_directory=None
        self.output_types=['json']
        self.paf_th=0.1
        self.path_gt='data/arrays/names-kitti-190513-1754.json'
        self.pif_fixed_scale=None
        self.predict=False
        self.pretrained=True
        self.profile_decoder=None
        self.scale=1.0
        self.seed_threshold=0.2
        self.show=False
        self.transform='None'
        self.two_scale=False
        self.webcam=False
        self.z_max=22
 
    def __getattr__(self, item):
        return None

class Base64Input(torch.utils.data.Dataset):
    """It defines transformations to apply to images and outputs of the dataloader"""
    def __init__(self, string, scale):
        self.string = string
        self.scale = scale
        self.image_paths = ['Base64']

    def __getitem__(self, index):
        ImageFile.LOAD_TRUNCATED_IMAGES = True
        im_bytes = base64.b64decode(self.string)   # im_bytes is a binary image
        im_file = BytesIO(im_bytes)  # convert image to file-like object
        self.pil = Image.open(im_file).convert('RGB')
        image = self.pil

        if self.scale > 1.01 or self.scale < 0.99:
            image = torchvision.transforms.functional.resize(image,
                                                             (round(self.scale * image.size[1]),
                                                              round(self.scale * image.size[0])),
                                                             interpolation=Image.BICUBIC)
        # PIL images are not iterables
        original_image = torchvision.transforms.functional.to_tensor(image)  # 0-255 --> 0-1
        image = image_transform(image)

        return 'Base64', original_image, image

    def __len__(self):
        return len(self.image_paths)

class TrainedPipeline:
    def __init__(self):
        self.args = Args()
        self.pifpaf = PifPaf(self.args)
        self.monoloco = MonoLoco(model='model.pkl', n_dropout=0, p_dropout=0.2)
        self.device = self.monoloco.device

    def thumbnails(self, image, boxes):
        ratio = 2/5
        thumbnails = []
        for index, box in enumerate(boxes):
            height = box[3] - box[1]
            width = height * ratio
            cx = (box[2] + box[0])/2
            x1 = cx - width/2
            x2 = cx + width/2
            thumb = image.crop((x1, box[1], x2, box[3]))
            im_file = BytesIO()
            thumb.save(im_file, format="JPEG")
            im_bytes = im_file.getvalue()  # im_bytes: image in binary format.
            thumbnails.append("data:image/jpeg;base64," + base64.b64encode(im_bytes).decode("utf-8"))

        return thumbnails


    def inference(self, base64):
        data = Base64Input(base64, scale=self.args.scale)
        data_loader = torch.utils.data.DataLoader(
            data, batch_size=1, shuffle=False
            )

        for idx, (image_paths, image_tensors, processed_images_cpu) in enumerate(data_loader):
            images = image_tensors.permute(0, 2, 3, 1)

            processed_images = processed_images_cpu.to(self.args.device, non_blocking=True)
            fields_batch = self.pifpaf.fields(processed_images)

            # unbatch
            for image_path, image, processed_image_cpu, fields in zip(
                    image_paths, images, processed_images_cpu, fields_batch):



                keypoint_sets, scores, pifpaf_out = self.pifpaf.forward(image, processed_image_cpu, fields)
                pifpaf_outputs = [keypoint_sets, scores, pifpaf_out]  # keypoints_sets and scores for pifpaf printing
                images_outputs = [image]  # List of 1 or 2 elements with pifpaf tensor (resized) and monoloco original image

                im_size = (float(image.size()[1] / self.args.scale),
                        float(image.size()[0] / self.args.scale))  # Width, Height (original)

                # Extract calibration matrix and ground truth file if present
                # with open(image_path, 'rb') as f:
                #     pil_image = Image.open(f).convert('RGB')
                #     images_outputs.append(pil_image)

                im_name = os.path.basename(image_path)

                kk, dic_gt = factory_for_gt(im_size, name=im_name, path_gt=None)
                # kk = [[718.3351, 0., 600.3891], [0., 718.3351, 181.5122], [0., 0., 1.]]

                # kk = [[2696.358, 0., 959.5], 
                #       [0., 2696.358, 539.5], 
                #       [0., 0., 1.]]

                # Preprocess pifpaf outputs and run monoloco
                boxes, keypoints = preprocess_pifpaf(pifpaf_out, im_size)
                outputs, varss = self.monoloco.forward(keypoints, kk)
                dic_out = self.monoloco.post_process(outputs, varss, boxes, keypoints, kk, {})

                dic_out['thumbnails'] = self.thumbnails(data.pil, dic_out['boxes'])

                return dic_out
                # factory_outputs(args, images_outputs, output_path, pifpaf_outputs, dic_out=dic_out, kk=kk)
                

